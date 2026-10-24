package com.aiportfolio.service;

import com.aiportfolio.domain.CandidateProfileEntity;
import com.aiportfolio.dto.ProfileResponseDto;
import com.aiportfolio.exception.InvalidProfileException;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.CandidateProfileRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads and replaces the single candidate profile.
 */
@Service
public class ProfileService {

    /** The top level keys the operator console is allowed to replace in isolation. */
    private static final Set<String> EDITABLE_SECTIONS = Set.of(
            "fullName", "headline", "summary", "location", "email", "phone", "sampleData",
            "education", "skills", "currentlyLearning", "projects", "experience",
            "achievements", "certifications", "codingProfiles", "links", "careerInterests");

    private final CandidateProfileRepository repository;
    private final CandidateProfileValidator validator;
    private final ObjectMapper objectMapper;

    public ProfileService(CandidateProfileRepository repository, CandidateProfileValidator validator,
                          ObjectMapper objectMapper) {
        this.repository = repository;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ProfileResponseDto getProfile() {
        CandidateProfileEntity entity = load();
        return new ProfileResponseDto(parse(entity.getProfileJson()), entity.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public JsonNode getProfileNode() {
        return parse(load().getProfileJson());
    }

    /**
     * @return the requested top level section of the stored profile.
     */
    @Transactional(readOnly = true)
    public JsonNode getSection(String section) {
        JsonNode node = getProfileNode().get(section);
        if (node == null || node.isNull()) {
            throw new ResourceNotFoundException("Profile section '" + section + "' was not found.");
        }
        return node;
    }

    @Transactional
    public ProfileResponseDto replace(JsonNode profile) {
        validator.validateOrThrow(profile);
        CandidateProfileEntity entity = repository.findFirstByOrderByIdAsc().orElseGet(CandidateProfileEntity::new);
        entity.setProfileJson(profile.toString());
        entity.setUpdatedAt(Instant.now());
        CandidateProfileEntity saved = repository.save(entity);
        return new ProfileResponseDto(parse(saved.getProfileJson()), saved.getUpdatedAt());
    }

    /**
     * Replaces one top level section and saves the whole profile.
     *
     * <p>The merged document is validated exactly like a full replace, so a
     * section edit can never leave the profile in a state the rest of the
     * application cannot read.</p>
     */
    @Transactional
    public ProfileResponseDto replaceSection(String section, JsonNode value) {
        if (section == null || !EDITABLE_SECTIONS.contains(section)) {
            throw new InvalidProfileException(
                    List.of("'" + section + "' is not an editable profile section."));
        }
        ObjectNode current = getProfileNode().deepCopy();
        current.set(section, value);
        return replace(current);
    }

    private CandidateProfileEntity load() {
        return repository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new ResourceNotFoundException("The candidate profile is not configured."));
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("The stored candidate profile is not valid JSON.", ex);
        }
    }
}
