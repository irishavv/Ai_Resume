-- Admin console: operator sessions, editable site settings and an audit trail (MySQL 8).

CREATE TABLE admin_session (
    id BINARY(16) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    last_used_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_admin_session_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_admin_session_expires_at ON admin_session (expires_at);

CREATE TABLE app_settings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    settings_json JSON NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE admin_audit_log (
    id BIGINT NOT NULL AUTO_INCREMENT,
    action VARCHAR(48) NOT NULL,
    target VARCHAR(96) NOT NULL,
    summary TEXT NOT NULL,
    actor VARCHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
