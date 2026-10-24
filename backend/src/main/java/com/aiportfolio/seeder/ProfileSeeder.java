package com.aiportfolio.seeder;

import com.aiportfolio.domain.CandidateProfileEntity;
import com.aiportfolio.repository.CandidateProfileRepository;
import com.aiportfolio.service.CandidateProfileValidator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds the single candidate profile from the bundled JSON document on first run.
 * Only the candidate's name is logged; the profile content never is.
 */
@Component
public class ProfileSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProfileSeeder.class);
    private static final String SEED_RESOURCE = "candidate-profile.json";

    private final CandidateProfileRepository repository;
    private final CandidateProfileValidator validator;
    private final ObjectMapper objectMapper;

    public ProfileSeeder(CandidateProfileRepository repository, CandidateProfileValidator validator,
                         ObjectMapper objectMapper) {
        this.repository = repository;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (repository.count() > 0) {
            return;
        }

        JsonNode profile;
        ClassPathResource resource = new ClassPathResource(SEED_RESOURCE);
        try (InputStream inputStream = resource.getInputStream()) {
            profile = objectMapper.readTree(inputStream);
        }
        validator.validateOrThrow(profile);

        CandidateProfileEntity entity = new CandidateProfileEntity();
        entity.setProfileJson(profile.toString());
        entity.setUpdatedAt(Instant.now());
        repository.save(entity);

        log.info("Seeded candidate profile for {}", profile.path("fullName").asText("unknown"));
    }
}
