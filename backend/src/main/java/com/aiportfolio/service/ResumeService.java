package com.aiportfolio.service;

import com.aiportfolio.client.AiServiceClient;
import com.aiportfolio.config.AiServiceProperties;
import com.aiportfolio.config.AppProperties;
import com.aiportfolio.dto.ResumeExtractionDto;
import com.aiportfolio.exception.AiServiceUnavailableException;
import com.aiportfolio.exception.InvalidResumeException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.Duration;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Validates an uploaded resume and forwards it to the AI service for extraction.
 *
 * <p>The upload is only ever held in memory: it is validated (presence, size,
 * content type, extension and the {@code %PDF-} magic number) and then streamed
 * to the AI service. Nothing is written to disk.</p>
 */
@Service
public class ResumeService {

    private static final byte[] PDF_MAGIC = {'%', 'P', 'D', 'F', '-'};
    private static final long BYTES_PER_MEGABYTE = 1024L * 1024L;

    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;
    private final long maxBytes;
    private final long timeoutMs;

    public ResumeService(AiServiceClient aiServiceClient, ObjectMapper objectMapper, AppProperties appProperties,
                         AiServiceProperties aiServiceProperties) {
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
        this.maxBytes = appProperties.getResume().getMaxBytes();
        this.timeoutMs = aiServiceProperties.getResponseTimeoutMs() + 5_000L;
    }

    public ResumeExtractionDto extract(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidResumeException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "A non-empty PDF file must be provided.");
        }
        if (file.getSize() > maxBytes) {
            throw new InvalidResumeException(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE",
                    "The resume exceeds the maximum allowed size of " + megabyteLimit() + " MB.");
        }

        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();
        if (contentType == null || !MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(contentType.trim())
                || filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new InvalidResumeException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                    "Only PDF resumes (application/pdf) are supported.");
        }

        byte[] content = readBytes(file);
        if (!hasPdfMagic(content)) {
            throw new InvalidResumeException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                    "The uploaded file is not a valid PDF.");
        }

        JsonNode result;
        try {
            result = aiServiceClient.extractResume(content, filename, MediaType.APPLICATION_PDF)
                    .block(Duration.ofMillis(timeoutMs));
        } catch (Exception ex) {
            throw new AiServiceUnavailableException("The AI service is currently unavailable.", ex);
        }

        if (result == null || result.isNull()) {
            throw new AiServiceUnavailableException("The AI service returned an empty response.");
        }

        try {
            return objectMapper.treeToValue(result, ResumeExtractionDto.class);
        } catch (JsonProcessingException ex) {
            throw new AiServiceUnavailableException("The AI service returned an unexpected response.", ex);
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new InvalidResumeException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "The uploaded file could not be read.");
        }
    }

    private static boolean hasPdfMagic(byte[] content) {
        if (content.length < PDF_MAGIC.length) {
            return false;
        }
        for (int i = 0; i < PDF_MAGIC.length; i++) {
            if (content[i] != PDF_MAGIC[i]) {
                return false;
            }
        }
        return true;
    }

    private long megabyteLimit() {
        return Math.max(1L, maxBytes / BYTES_PER_MEGABYTE);
    }
}
