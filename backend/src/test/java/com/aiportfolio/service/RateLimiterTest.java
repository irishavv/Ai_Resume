package com.aiportfolio.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

    @Test
    void allowsLimitThenBlocksWithinTheWindow() {
        RateLimiter limiter = new RateLimiter(3, 10_000L);

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();
    }

    @Test
    void differentKeysAreIndependent() {
        RateLimiter limiter = new RateLimiter(2, 10_000L);

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();

        assertThat(limiter.tryAcquire("client-b")).isTrue();
        assertThat(limiter.tryAcquire("client-b")).isTrue();
        assertThat(limiter.tryAcquire("client-b")).isFalse();
    }

    @Test
    void windowResetsAfterItExpires() throws InterruptedException {
        RateLimiter limiter = new RateLimiter(1, 150L);

        assertThat(limiter.tryAcquire("client-a")).isTrue();
        assertThat(limiter.tryAcquire("client-a")).isFalse();

        Thread.sleep(250L);

        assertThat(limiter.tryAcquire("client-a")).isTrue();
    }

    @Test
    void retryAfterIsAlwaysAtLeastOneSecond() {
        RateLimiter limiter = new RateLimiter(1, 60_000L);
        limiter.tryAcquire("client-a");

        assertThat(limiter.retryAfterSeconds("client-a")).isGreaterThanOrEqualTo(1L);
    }
}
