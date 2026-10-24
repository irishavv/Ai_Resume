package com.aiportfolio.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;

class AiServiceClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockWebServer server;
    private AiServiceClient client;
    private JsonNode profile;

    @BeforeEach
    void setUp() throws IOException {
        server = new MockWebServer();
        server.start();
        WebClient webClient = WebClient.builder().baseUrl(server.url("/").toString()).build();
        client = new AiServiceClient(webClient);
        profile = objectMapper.createObjectNode().put("fullName", "Ada Lovelace");
    }

    @AfterEach
    void tearDown() throws IOException {
        server.shutdown();
    }

    @Test
    void jobMatchPostsToTheInternalPathWithTheJobDescription() throws Exception {
        server.enqueue(new MockResponse()
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"overallScore\":80}"));

        JsonNode result = client.jobMatch(profile, "Senior Backend Engineer", null).block();

        assertThat(result).isNotNull();
        assertThat(result.get("overallScore").asInt()).isEqualTo(80);

        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).isEqualTo("/ai/job-match");
        assertThat(request.getBody().readUtf8()).contains("Senior Backend Engineer");
    }

    @Test
    void jobMatchForwardsTheOperatorConfiguredRubric() throws Exception {
        server.enqueue(new MockResponse()
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"suitabilityScore\":70}"));

        JsonNode rubric = objectMapper.createArrayNode()
                .add(objectMapper.createObjectNode().put("criterion", "Core depth").put("weight", 60))
                .add(objectMapper.createObjectNode().put("criterion", "Delivery").put("weight", 40));

        client.jobMatch(profile, "Senior Backend Engineer", rubric).block();

        RecordedRequest request = server.takeRequest();
        String body = request.getBody().readUtf8();
        assertThat(body).contains("Core depth");
        assertThat(body).contains("weight");
    }

    @Test
    void chatStreamParsesOrderedDeltaAndDoneEvents() {
        String body = "event: delta\n"
                + "data: {\"text\":\"Hel\"}\n\n"
                + "event: delta\n"
                + "data: {\"text\":\"lo\"}\n\n"
                + "event: done\n"
                + "data: {\"content\":\"Hello\",\"provider\":\"groq\"}\n\n";
        server.enqueue(new MockResponse()
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_EVENT_STREAM_VALUE)
                .setBody(body));

        Flux<ServerSentEvent<String>> stream = client.streamChat(
                profile, List.of(Map.of("role", "user", "content", "hi")), "who are you?", "en");

        List<ServerSentEvent<String>> events = stream.collectList().block();

        assertThat(events).isNotNull();
        assertThat(events.stream().map(ServerSentEvent::event).collect(Collectors.toList()))
                .containsExactly("delta", "delta", "done");
        assertThat(events.get(0).data()).contains("Hel");
        assertThat(events.get(1).data()).contains("lo");
        assertThat(events.get(2).data()).contains("Hello");
    }

    @Test
    void serverErrorSurfacesAsAnErrorSignal() {
        server.enqueue(new MockResponse().setResponseCode(500).setBody("boom"));

        StepVerifier.create(client.streamChat(profile, List.of(), "question", "en"))
                .expectError()
                .verify();
    }

    @Test
    void extractResumePostsMultipartWithTheFileNameAndBytes() throws Exception {
        server.enqueue(new MockResponse()
                .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .setBody("{\"verified\":false}"));

        byte[] pdf = "%PDF-1.7 resume body".getBytes(StandardCharsets.UTF_8);
        JsonNode result = client.extractResume(pdf, "resume.pdf", MediaType.APPLICATION_PDF).block();

        assertThat(result).isNotNull();
        assertThat(result.get("verified").asBoolean()).isFalse();

        RecordedRequest request = server.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).isEqualTo("/ai/resume/extract");
        String body = request.getBody().readUtf8();
        assertThat(body).contains("name=\"file\"");
        assertThat(body).contains("filename=\"resume.pdf\"");
        assertThat(body).contains("%PDF-");
    }
}
