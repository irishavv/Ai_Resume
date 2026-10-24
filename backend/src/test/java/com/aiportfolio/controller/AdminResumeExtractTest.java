package com.aiportfolio.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiportfolio.client.AiServiceClient;
import com.aiportfolio.config.AiServiceProperties;
import com.aiportfolio.config.AppProperties;
import com.aiportfolio.service.AdminAuditService;
import com.aiportfolio.service.AdminAuthService;
import com.aiportfolio.service.AdminConversationService;
import com.aiportfolio.service.AdminInsightsService;
import com.aiportfolio.service.ProfileService;
import com.aiportfolio.service.ResumeService;
import com.aiportfolio.service.SettingsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import reactor.core.publisher.Mono;

/**
 * Exercises the operator console resume import endpoint
 * ({@code POST /api/admin/resume/extract}). The session filter is disabled and
 * the authenticated operator attribute is supplied directly, so the tests focus
 * on validation and AI forwarding only.
 */
@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({ResumeService.class, AppProperties.class, AiServiceProperties.class})
class AdminResumeExtractTest {

    private static final String EXTRACT_PATH = "/api/admin/resume/extract";
    private static final String ACTOR = "tester";
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.UTF_8);
    private static final byte[] PDF_BODY = "%PDF-1.7 test resume body".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AiServiceClient aiServiceClient;

    @MockBean
    private AdminAuthService adminAuthService;

    @MockBean
    private ProfileService profileService;

    @MockBean
    private SettingsService settingsService;

    @MockBean
    private AdminConversationService adminConversationService;

    @MockBean
    private AdminInsightsService adminInsightsService;

    @MockBean
    private AdminAuditService adminAuditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void extractionPassesTheAiServicePayloadThroughUnchanged() throws Exception {
        String payload = """
                {
                  "draft": { "fullName": "Ada Lovelace", "skills": { "languages": ["Java", "Python"] } },
                  "detectedSections": ["education", "skills"],
                  "warnings": ["No phone number found"],
                  "sourceFileName": "resume.pdf",
                  "extractedCharacters": 1234,
                  "verified": false
                }""";
        JsonNode response = objectMapper.readTree(payload);
        given(aiServiceClient.extractResume(any(byte[].class), anyString(), any(MediaType.class)))
                .willReturn(Mono.just(response));

        mockMvc.perform(multipart(EXTRACT_PATH).file(pdfFile()).requestAttr(AdminAuthService.ACTOR_ATTRIBUTE, ACTOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.draft.fullName").value("Ada Lovelace"))
                .andExpect(jsonPath("$.draft.skills.languages[0]").value("Java"))
                .andExpect(jsonPath("$.draft.skills.languages[1]").value("Python"))
                .andExpect(jsonPath("$.detectedSections[0]").value("education"))
                .andExpect(jsonPath("$.detectedSections[1]").value("skills"))
                .andExpect(jsonPath("$.warnings[0]").value("No phone number found"))
                .andExpect(jsonPath("$.sourceFileName").value("resume.pdf"))
                .andExpect(jsonPath("$.extractedCharacters").value(1234))
                .andExpect(jsonPath("$.verified").value(false));
    }

    @Test
    void missingFileIsRejectedWith400() throws Exception {
        mockMvc.perform(withActor(multipart(EXTRACT_PATH)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));

        verify(aiServiceClient, never()).extractResume(any(byte[].class), anyString(), any(MediaType.class));
    }

    @Test
    void emptyFileIsRejectedWith400() throws Exception {
        MockMultipartFile empty = new MockMultipartFile("file", "resume.pdf", MediaType.APPLICATION_PDF_VALUE,
                new byte[0]);

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(empty)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void fileLargerThanTheConfiguredLimitIsRejectedWith413() throws Exception {
        // The configured limit defaults to 5 MB (5_242_880 bytes); one byte more must be rejected.
        byte[] oversized = new byte[5_242_881];
        System.arraycopy(PDF_MAGIC, 0, oversized, 0, PDF_MAGIC.length);
        MockMultipartFile big = new MockMultipartFile("file", "resume.pdf", MediaType.APPLICATION_PDF_VALUE, oversized);

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(big)))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error.code").value("PAYLOAD_TOO_LARGE"));

        verify(aiServiceClient, never()).extractResume(any(byte[].class), anyString(), any(MediaType.class));
    }

    @Test
    void wrongContentTypeIsRejectedWith415() throws Exception {
        MockMultipartFile wrongType = new MockMultipartFile("file", "resume.pdf", MediaType.TEXT_PLAIN_VALUE,
                PDF_BODY);

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(wrongType)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void wrongExtensionIsRejectedWith415() throws Exception {
        MockMultipartFile wrongExtension = new MockMultipartFile("file", "resume.txt", MediaType.APPLICATION_PDF_VALUE,
                PDF_BODY);

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(wrongExtension)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void missingPdfMagicBytesIsRejectedWith415() throws Exception {
        MockMultipartFile notAPdf = new MockMultipartFile("file", "resume.pdf", MediaType.APPLICATION_PDF_VALUE,
                "not a real pdf document".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(notAPdf)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"));

        verify(aiServiceClient, never()).extractResume(any(byte[].class), anyString(), any(MediaType.class));
    }

    @Test
    void unreachableAiServiceIsReportedWith503() throws Exception {
        given(aiServiceClient.extractResume(any(byte[].class), anyString(), any(MediaType.class)))
                .willReturn(Mono.error(new IllegalStateException("AI service down")));

        mockMvc.perform(withActor(multipart(EXTRACT_PATH).file(pdfFile())))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("AI_SERVICE_UNAVAILABLE"));
    }

    private static MockHttpServletRequestBuilder withActor(MockHttpServletRequestBuilder builder) {
        return builder.requestAttr(AdminAuthService.ACTOR_ATTRIBUTE, ACTOR);
    }

    private static MockMultipartFile pdfFile() {
        return new MockMultipartFile("file", "resume.pdf", MediaType.APPLICATION_PDF_VALUE, PDF_BODY);
    }
}
