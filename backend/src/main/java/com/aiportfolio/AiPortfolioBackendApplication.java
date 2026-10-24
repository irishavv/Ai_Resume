package com.aiportfolio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AiPortfolioBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiPortfolioBackendApplication.class, args);
    }
}
