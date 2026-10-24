package com.aiportfolio.service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Thread-safe in-memory sliding-window rate limiter.
 *
 * <p>Each key keeps the timestamps of its recent requests. A key is only allowed
 * while it has fewer than {@code limitPerMinute} timestamps inside the window.
 * Per-key deques are pruned on every access and a periodic sweep removes keys
 * that have gone quiet, so memory stays bounded regardless of how many client
 * ids are seen.</p>
 */
public class RateLimiter {

    private static final long SWEEP_INTERVAL = 512L;

    private volatile int limitPerMinute;
    private final long windowMs;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final AtomicLong operations = new AtomicLong();

    public RateLimiter(int limitPerMinute, long windowMs) {
        this.limitPerMinute = limitPerMinute;
        this.windowMs = windowMs;
    }

    /**
     * Updates the allowance. Called when an operator changes the limit from the
     * console; in-flight windows keep their already recorded timestamps.
     */
    public void setLimitPerMinute(int limitPerMinute) {
        this.limitPerMinute = limitPerMinute;
    }

    public int getLimitPerMinute() {
        return limitPerMinute;
    }

    /**
     * @return {@code true} when the request is allowed, {@code false} when the
     * allowance for this key is exhausted within the current window.
     */
    public boolean tryAcquire(String key) {
        if (limitPerMinute <= 0) {
            return true;
        }
        long now = System.currentTimeMillis();
        Deque<Long> deque = hits.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        boolean allowed;
        synchronized (deque) {
            prune(deque, now);
            if (deque.size() >= limitPerMinute) {
                allowed = false;
            } else {
                deque.addLast(now);
                allowed = true;
            }
        }
        if (operations.incrementAndGet() % SWEEP_INTERVAL == 0L) {
            sweep(now);
        }
        return allowed;
    }

    /**
     * Seconds until the caller may retry, always at least 1.
     */
    public long retryAfterSeconds(String key) {
        Deque<Long> deque = hits.get(key);
        if (deque == null) {
            return 1L;
        }
        synchronized (deque) {
            if (deque.isEmpty()) {
                return 1L;
            }
            long oldest = deque.peekFirst();
            long waitMs = windowMs - (System.currentTimeMillis() - oldest);
            return Math.max(1L, (waitMs + 999L) / 1000L);
        }
    }

    private void prune(Deque<Long> deque, long now) {
        while (!deque.isEmpty() && now - deque.peekFirst() >= windowMs) {
            deque.pollFirst();
        }
    }

    private void sweep(long now) {
        Iterator<Map.Entry<String, Deque<Long>>> iterator = hits.entrySet().iterator();
        while (iterator.hasNext()) {
            Deque<Long> deque = iterator.next().getValue();
            synchronized (deque) {
                prune(deque, now);
                if (deque.isEmpty()) {
                    iterator.remove();
                }
            }
        }
    }
}
