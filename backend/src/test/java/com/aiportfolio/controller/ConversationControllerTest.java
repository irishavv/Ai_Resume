package com.aiportfolio.controller;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aiportfolio.config.AppProperties;
import com.aiportfolio.exception.ResourceNotFoundException;
import com.aiportfolio.service.AdminAuthService;
import com.aiportfolio.service.ChatStreamService;
import com.aiportfolio.service.ConversationService;
import com.aiportfolio.service.RateLimiter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ConversationController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AppProperties.class)
class ConversationControllerTest {

    private static final String CLIENT_ID = "client-test-0001";
    private static final String MESSAGES_PATH = "/api/conversations/{id}/messages";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ConversationService conversationService;

    @MockBean
    private ChatStreamService chatStreamService;

    @MockBean
    private RateLimiter rateLimiter;

    @MockBean
    private AdminAuthService adminAuthService;

    @Test
    void blankContentIsRejectedWith400() throws Exception {
        mockMvc.perform(post(MESSAGES_PATH, UUID.randomUUID())
                        .header("X-Client-Id", CLIENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void contentLongerThan2000CharactersIsRejectedWith400() throws Exception {
        String oversized = "x".repeat(2001);

        mockMvc.perform(post(MESSAGES_PATH, UUID.randomUUID())
                        .header("X-Client-Id", CLIENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"" + oversized + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void missingClientIdHeaderIsRejectedWith400() throws Exception {
        mockMvc.perform(post(MESSAGES_PATH, UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello there\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void invalidClientIdHeaderIsRejectedWith400() throws Exception {
        mockMvc.perform(post(MESSAGES_PATH, UUID.randomUUID())
                        .header("X-Client-Id", "bad")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello there\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void rateLimitedRequestIsRejectedWith429() throws Exception {
        given(rateLimiter.tryAcquire(anyString())).willReturn(false);
        given(rateLimiter.retryAfterSeconds(anyString())).willReturn(30L);

        mockMvc.perform(post(MESSAGES_PATH, UUID.randomUUID())
                        .header("X-Client-Id", CLIENT_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hello there\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "30"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }

    @Test
    void anotherClientsConversationIsReportedAs404() throws Exception {
        UUID id = UUID.randomUUID();
        willThrow(new ResourceNotFoundException("Conversation not found."))
                .given(conversationService).getConversation(id, CLIENT_ID);

        mockMvc.perform(get("/api/conversations/{id}", id).header("X-Client-Id", CLIENT_ID))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }
}
