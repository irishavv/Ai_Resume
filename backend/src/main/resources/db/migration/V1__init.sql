-- Initial schema for the AI Portfolio backend (MySQL 8).
-- UUIDs are stored as BINARY(16) and instants as DATETIME(6), matching the
-- Hibernate 6 MySQL dialect mappings so `ddl-auto=validate` passes.

CREATE TABLE candidate_profile (
    id BIGINT NOT NULL AUTO_INCREMENT,
    profile_json JSON NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE conversations (
    id BINARY(16) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_conversations_client_id ON conversations (client_id);

CREATE TABLE messages (
    id BINARY(16) NOT NULL,
    conversation_id BINARY(16) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(16) NOT NULL,
    provider VARCHAR(32) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id)
        REFERENCES conversations (id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
