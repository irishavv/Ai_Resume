package com.aiportfolio.exception;

import java.util.List;

/**
 * Raised when a submitted settings document breaks an invariant the application
 * depends on. Carries every problem so the console can list them at once.
 */
public class InvalidSettingsException extends RuntimeException {

    private final List<String> problems;

    public InvalidSettingsException(List<String> problems) {
        super("The site settings are invalid.");
        this.problems = List.copyOf(problems);
    }

    public List<String> getProblems() {
        return problems;
    }
}
