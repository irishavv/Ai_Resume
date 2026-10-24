package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;

import com.aiportfolio.domain.CandidateProfileEntity;
import com.aiportfolio.dto.ProfileResponseDto;
import com.aiportfolio.exception.InvalidProfileException;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.repository.CandidateProfileRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ClassPathResource;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private CandidateProfileRepository repository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ProfileService service;
    private JsonNode realProfile;

    @BeforeEach
    void setUp() throws Exception {
        service = new ProfileService(repository, new CandidateProfileValidator(), objectMapper);
        try (InputStream inputStream = new ClassPathResource("candidate-profile.json").getInputStream()) {
            realProfile = objectMapper.readTree(inputStream);
        }
        lenient().when(repository.save(any(CandidateProfileEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void replacingOneSectionKeepsEveryOtherSection() {
        given(repository.findFirstByOrderByIdAsc()).willReturn(Optional.of(entity(realProfile)));

        ProfileResponseDto updated =
                service.replaceSection("headline", objectMapper.getNodeFactory().textNode("Backend Engineer"));

        assertThat(updated.profile().get("headline").asText()).isEqualTo("Backend Engineer");
        assertThat(updated.profile().get("fullName").asText())
                .isEqualTo(realProfile.get("fullName").asText());
        assertThat(updated.profile().get("projects")).isEqualTo(realProfile.get("projects"));
    }

    @Test
    void aSectionThatInvalidatesTheProfileIsRejected() {
        given(repository.findFirstByOrderByIdAsc()).willReturn(Optional.of(entity(realProfile)));

        assertThatThrownBy(() -> service.replaceSection("projects", objectMapper.getNodeFactory().textNode("nope")))
                .isInstanceOf(InvalidProfileException.class);
    }

    @Test
    void onlyKnownSectionsMayBeEditedInIsolation() {
        assertThatThrownBy(() -> service.replaceSection("password", objectMapper.getNodeFactory().textNode("x")))
                .isInstanceOf(InvalidProfileException.class);
    }

    @Test
    void anUnknownSectionIsReportedAsNotFound() {
        given(repository.findFirstByOrderByIdAsc()).willReturn(Optional.of(entity(realProfile)));

        assertThatThrownBy(() -> service.getSection("nope"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void readingAnUnconfiguredProfileIsReportedAsNotFound() {
        given(repository.findFirstByOrderByIdAsc()).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getProfile())
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private CandidateProfileEntity entity(JsonNode profile) {
        CandidateProfileEntity entity = new CandidateProfileEntity();
        entity.setId(1L);
        entity.setProfileJson(profile.toString());
        entity.setUpdatedAt(Instant.now());
        return entity;
    }
}
