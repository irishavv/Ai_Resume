package com.aiportfolio.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application level configuration bound from the {@code app.*} properties.
 */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Cors cors = new Cors();
    private final Admin admin = new Admin();
    private final RateLimit rateLimit = new RateLimit();
    private final Chat chat = new Chat();
    private final Resume resume = new Resume();

    public Cors getCors() {
        return cors;
    }

    public Admin getAdmin() {
        return admin;
    }

    public RateLimit getRateLimit() {
        return rateLimit;
    }

    public Chat getChat() {
        return chat;
    }

    public Resume getResume() {
        return resume;
    }

    public static class Cors {

        private List<String> allowedOrigins = new ArrayList<>();

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    /**
     * Credentials for the operator console.
     *
     * <p>{@code username}/{@code password} are the console login. With no password
     * configured the console is disabled and answers 503 instead of being silently
     * open.</p>
     */
    public static class Admin {

        private String username = "admin";
        private String password = "";
        private int sessionTtlMinutes = 480;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public int getSessionTtlMinutes() {
            return sessionTtlMinutes;
        }

        public void setSessionTtlMinutes(int sessionTtlMinutes) {
            this.sessionTtlMinutes = sessionTtlMinutes;
        }
    }

    public static class RateLimit {

        private int chatPerMinute = 20;

        public int getChatPerMinute() {
            return chatPerMinute;
        }

        public void setChatPerMinute(int chatPerMinute) {
            this.chatPerMinute = chatPerMinute;
        }
    }

    public static class Chat {

        private int historyLimit = 20;

        public int getHistoryLimit() {
            return historyLimit;
        }

        public void setHistoryLimit(int historyLimit) {
            this.historyLimit = historyLimit;
        }
    }

    public static class Resume {

        private long maxBytes = 5_242_880L;

        public long getMaxBytes() {
            return maxBytes;
        }

        public void setMaxBytes(long maxBytes) {
            this.maxBytes = maxBytes;
        }
    }
}
