package com.aiportfolio.service;

import com.aiportfolio.config.AppProperties;
import com.aiportfolio.domain.AppSettingsEntity;
import com.aiportfolio.dto.SettingsResponseDto;
import com.aiportfolio.repository.AppSettingsRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads and replaces the single site settings document, and applies the subset
 * of it that changes runtime behaviour.
 *
 * <p>Stored settings always win; the bundled {@code default-settings.json} is the
 * fallback and also supplies a default for any section a stored document is
 * missing, so the schema can grow without a migration.</p>
 */
@Service
public class SettingsService {

    private static final Logger log = LoggerFactory.getLogger(SettingsService.class);
    private static final String DEFAULTS_RESOURCE = "default-settings.json";
    /** The single section that is never exposed to the public endpoint. */
    private static final String INTERNAL_SECTION = "ai";

    private final AppSettingsRepository repository;
    private final SettingsValidator validator;
    private final ObjectMapper objectMapper;
    private final AppProperties properties;
    private final RuntimeSettings runtimeSettings;
    private final RateLimiter rateLimiter;

    private volatile JsonNode defaults;

    public SettingsService(AppSettingsRepository repository, SettingsValidator validator, ObjectMapper objectMapper,
                           AppProperties properties, RuntimeSettings runtimeSettings, RateLimiter rateLimiter) {
        this.repository = repository;
        this.validator = validator;
        this.objectMapper = objectMapper;
        this.properties = properties;
        this.runtimeSettings = runtimeSettings;
        this.rateLimiter = rateLimiter;
    }

    /**
     * The bundled defaults, with the two operational limits seeded from the
     * environment so a fresh install behaves exactly like the previous
     * environment-variable-only configuration.
     */
    public JsonNode defaultDocument() {
        ObjectNode document = readDefaults().deepCopy();
        JsonNode aiNode = document.get(INTERNAL_SECTION);
        ObjectNode ai = aiNode != null && aiNode.isObject()
                ? (ObjectNode) aiNode
                : document.putObject(INTERNAL_SECTION);
        ai.put("historyLimit", properties.getChat().getHistoryLimit());
        ai.put("rateLimitPerMinute", properties.getRateLimit().getChatPerMinute());
        return document;
    }

    @Transactional(readOnly = true)
    public SettingsResponseDto getSettings() {
        return repository.findFirstByOrderByIdAsc()
                .map(entity -> new SettingsResponseDto(merged(parse(entity.getSettingsJson())), entity.getUpdatedAt()))
                .orElseGet(() -> new SettingsResponseDto(defaultDocument(), null));
    }

    /**
     * The settings the public site reads, with the internal {@code ai} section
     * (limits and the scoring rubric) removed.
     */
    @Transactional(readOnly = true)
    public SettingsResponseDto getPublicSettings() {
        SettingsResponseDto full = getSettings();
        ObjectNode publicView = objectMapper.createObjectNode();
        full.settings().fields().forEachRemaining(entry -> {
            if (!INTERNAL_SECTION.equals(entry.getKey())) {
                publicView.set(entry.getKey(), entry.getValue());
            }
        });
        return new SettingsResponseDto(publicView, full.updatedAt());
    }

    @Transactional
    public SettingsResponseDto replace(JsonNode settings) {
        validator.validateOrThrow(settings);
        AppSettingsEntity entity = repository.findFirstByOrderByIdAsc().orElseGet(AppSettingsEntity::new);
        entity.setSettingsJson(settings.toString());
        entity.setUpdatedAt(Instant.now());
        AppSettingsEntity saved = repository.save(entity);
        JsonNode merged = merged(parse(saved.getSettingsJson()));
        applyRuntime(merged);
        return new SettingsResponseDto(merged, saved.getUpdatedAt());
    }

    /**
     * Persists the bundled defaults. Used once on first run so the console always
     * has a row to edit.
     */
    @Transactional
    public void seedIfMissing() {
        if (repository.count() > 0) {
            return;
        }
        JsonNode seeded = defaultDocument();
        AppSettingsEntity entity = new AppSettingsEntity();
        entity.setSettingsJson(seeded.toString());
        entity.setUpdatedAt(Instant.now());
        repository.save(entity);
        log.info("Seeded default site settings");
    }

    /**
     * The job-match rubric forwarded to the AI service on every analysis.
     *
     * @return the configured rubric, or {@code null} when none is stored so the
     *         AI service keeps using its own default.
     */
    @Transactional(readOnly = true)
    public ArrayNode jobMatchRubric() {
        JsonNode node = getSettings().settings().path(INTERNAL_SECTION).path("jobMatchRubric");
        return node.isArray() ? (ArrayNode) node : null;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        seedIfMissing();
        applyRuntime(getSettings().settings());
    }

    private void applyRuntime(JsonNode settings) {
        JsonNode ai = settings.path(INTERNAL_SECTION);
        if (!ai.isObject()) {
            return;
        }
        if (ai.has("historyLimit")) {
            runtimeSettings.setChatHistoryLimit(ai.path("historyLimit").asInt(runtimeSettings.getChatHistoryLimit()));
        }
        if (ai.has("rateLimitPerMinute")) {
            int limit = ai.path("rateLimitPerMinute").asInt(runtimeSettings.getChatRateLimitPerMinute());
            runtimeSettings.setChatRateLimitPerMinute(limit);
            rateLimiter.setLimitPerMinute(limit);
        }
    }

    /** Fills any section the stored document is missing from the defaults. */
    private JsonNode merged(JsonNode stored) {
        ObjectNode defaultsCopy = readDefaults().deepCopy();
        return merge(defaultsCopy, stored);
    }

    private static JsonNode merge(ObjectNode target, JsonNode source) {
        if (source == null || !source.isObject()) {
            return target;
        }
        Iterator<Map.Entry<String, JsonNode>> fields = source.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            JsonNode existing = target.get(entry.getKey());
            if (existing != null && existing.isObject() && entry.getValue().isObject()) {
                merge((ObjectNode) existing, entry.getValue());
            } else {
                target.set(entry.getKey(), entry.getValue());
            }
        }
        return target;
    }

    private JsonNode readDefaults() {
        JsonNode cached = defaults;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (defaults == null) {
                defaults = loadDefaults();
            }
            return defaults;
        }
    }

    private JsonNode loadDefaults() {
        ClassPathResource resource = new ClassPathResource(DEFAULTS_RESOURCE);
        try (InputStream inputStream = resource.getInputStream()) {
            return objectMapper.readTree(inputStream);
        } catch (IOException ex) {
            throw new IllegalStateException("The bundled default settings could not be read.", ex);
        }
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("The stored site settings are not valid JSON.", ex);
        }
    }
}
