package com.aiportfolio.controller;

import com.aiportfolio.dto.JobMatchRequestDto;
import com.aiportfolio.dto.JobMatchResultDto;
import com.aiportfolio.exception.RateLimitExceededException;
import com.aiportfolio.service.JobMatchService;
import com.aiportfolio.service.RateLimiter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Job match endpoint: validates the request, applies the per-client rate limit
 * and proxies to the AI service.
 */
@RestController
@RequestMapping("/api")
@Validated
public class JobMatchController {

    private static final String CLIENT_ID_HEADER = "X-Client-Id";
    private static final String CLIENT_ID_PATTERN = "[A-Za-z0-9_-]+";

    private final JobMatchService jobMatchService;
    private final RateLimiter rateLimiter;

    public JobMatchController(JobMatchService jobMatchService, RateLimiter rateLimiter) {
        this.jobMatchService = jobMatchService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/job-match")
    public JobMatchResultDto matchJob(
            @RequestHeader(value = CLIENT_ID_HEADER)
            @Size(min = 8, max = 64) @Pattern(regexp = CLIENT_ID_PATTERN) String clientId,
            @Valid @RequestBody JobMatchRequestDto body) {
        if (!rateLimiter.tryAcquire(clientId)) {
            throw new RateLimitExceededException(rateLimiter.retryAfterSeconds(clientId));
        }
        return jobMatchService.match(body.jobDescription());
    }
}
