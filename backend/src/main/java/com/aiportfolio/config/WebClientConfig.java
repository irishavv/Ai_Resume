package com.aiportfolio.config;

import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/**
 * Builds the single {@link WebClient} used to talk to the FastAPI AI service.
 * Reactor Netty is used only for its connect/response timeout support.
 */
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient aiServiceWebClient(AiServiceProperties properties) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, properties.getConnectTimeoutMs())
                .responseTimeout(Duration.ofMillis(properties.getResponseTimeoutMs()));

        return WebClient.builder()
                .baseUrl(trimTrailingSlash(properties.getBaseUrl()))
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return null;
        }
        int end = url.length();
        while (end > 0 && url.charAt(end - 1) == '/') {
            end--;
        }
        return url.substring(0, end);
    }
}
