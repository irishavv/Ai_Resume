package com.aiportfolio.client;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Thin HTTP client for the internal FastAPI AI service.
 *
 * <p>The backend never builds the system prompt; it forwards the opaque candidate
 * profile together with the conversation history and the current question.</p>
 */
@Component
public class AiServiceClient {

    private static final ParameterizedTypeReference<ServerSentEvent<String>> SSE_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final WebClient webClient;

    public AiServiceClient(WebClient aiServiceWebClient) {
        this.webClient = aiServiceWebClient;
    }

    /**
     * Streams a chat answer. Emits named {@code delta}/{@code done}/{@code error} events.
     */
    public Flux<ServerSentEvent<String>> streamChat(JsonNode profile, List<Map<String, String>> messages,
                                                    String question, String language) {
        return webClient.post()
                .uri("/ai/chat/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .bodyValue(new ChatStreamRequest(profile, messages, question, language))
                .retrieve()
                .bodyToFlux(SSE_TYPE);
    }

    /**
     * Runs the job match analysis and returns the raw result document.
     *
     * @param rubric the operator-configured rubric, or {@code null} to let the AI
     *               service apply its built-in default
     */
    public Mono<JsonNode> jobMatch(JsonNode profile, String jobDescription, JsonNode rubric) {
        return webClient.post()
                .uri("/ai/job-match")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(new JobMatchRequest(profile, jobDescription, rubric))
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    /**
     * Readiness probe of the AI service.
     */
    public Mono<JsonNode> health() {
        return webClient.get()
                .uri("/health")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    /**
     * Forwards a resume PDF to the AI service for extraction as
     * {@code multipart/form-data}. The bytes are held in memory only.
     */
    public Mono<JsonNode> extractResume(byte[] content, String filename, MediaType contentType) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(content) {
            @Override
            public String getFilename() {
                return filename;
            }
        }).contentType(contentType == null ? MediaType.APPLICATION_PDF : contentType);

        return webClient.post()
                .uri("/ai/resume/extract")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .accept(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(JsonNode.class);
    }
}
