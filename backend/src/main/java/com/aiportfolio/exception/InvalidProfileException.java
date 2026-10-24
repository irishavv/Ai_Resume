package com.aiportfolio.exception;

import java.util.List;

/**
 * Raised when a candidate profile fails structural validation.
 */
public class InvalidProfileException extends RuntimeException {

    private final List<String> problems;

    public InvalidProfileException(List<String> problems) {
        super(String.join("; ", problems));
        this.problems = List.copyOf(problems);
    }

    public List<String> getProblems() {
        return problems;
    }
}
