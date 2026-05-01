CREATE TABLE IF NOT EXISTS guacamole_user (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    password_hash BYTEA NOT NULL,
    password_salt BYTEA,
    password_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disabled BOOLEAN NOT NULL DEFAULT FALSE,
    expired BOOLEAN NOT NULL DEFAULT FALSE,
    access_window_start TIME,
    access_window_end TIME,
    valid_from DATE,
    valid_until DATE,
    timezone VARCHAR(64),
    full_name VARCHAR(256),
    email_address VARCHAR(256),
    organization VARCHAR(256),
    organizational_role VARCHAR(256)
);

CREATE TABLE IF NOT EXISTS guacamole_user_permission (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    affected_user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, affected_user_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_system_permission (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_group (
    connection_group_id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    connection_group_name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'ORGANIZATIONAL',
    max_connections INTEGER,
    max_connections_per_user INTEGER,
    enable_session_affinity BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS guacamole_connection (
    connection_id SERIAL PRIMARY KEY,
    connection_name VARCHAR(128) NOT NULL,
    parent_id INTEGER REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    protocol VARCHAR(32) NOT NULL,
    max_connections INTEGER,
    max_connections_per_user INTEGER,
    connection_weight INTEGER,
    failover_only BOOLEAN NOT NULL DEFAULT FALSE,
    proxy_port INTEGER,
    proxy_hostname VARCHAR(512),
    proxy_encryption_method VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_parameter (
    connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    parameter_name VARCHAR(128) NOT NULL,
    parameter_value TEXT,
    PRIMARY KEY (connection_id, parameter_name)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_permission (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, connection_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_group_permission (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    connection_group_id INTEGER NOT NULL REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, connection_group_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_sharing_profile (
    sharing_profile_id SERIAL PRIMARY KEY,
    sharing_profile_name VARCHAR(128) NOT NULL,
    primary_connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guacamole_sharing_profile_parameter (
    sharing_profile_id INTEGER NOT NULL REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    parameter_name VARCHAR(128) NOT NULL,
    parameter_value TEXT,
    PRIMARY KEY (sharing_profile_id, parameter_name)
);

CREATE TABLE IF NOT EXISTS guacamole_sharing_profile_permission (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    sharing_profile_id INTEGER NOT NULL REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, sharing_profile_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_entity (
    entity_id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,
    UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS guacamole_user_attribute (
    user_id INTEGER NOT NULL REFERENCES guacamole_user(user_id) ON DELETE CASCADE,
    attribute_name VARCHAR(128) NOT NULL,
    attribute_value TEXT,
    PRIMARY KEY (user_id, attribute_name)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_attribute (
    connection_id INTEGER NOT NULL REFERENCES guacamole_connection(connection_id) ON DELETE CASCADE,
    attribute_name VARCHAR(128) NOT NULL,
    attribute_value TEXT,
    PRIMARY KEY (connection_id, attribute_name)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_group_attribute (
    connection_group_id INTEGER NOT NULL REFERENCES guacamole_connection_group(connection_group_id) ON DELETE CASCADE,
    attribute_name VARCHAR(128) NOT NULL,
    attribute_value TEXT,
    PRIMARY KEY (connection_group_id, attribute_name)
);

CREATE TABLE IF NOT EXISTS guacamole_sharing_profile_attribute (
    sharing_profile_id INTEGER NOT NULL REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE CASCADE,
    attribute_name VARCHAR(128) NOT NULL,
    attribute_value TEXT,
    PRIMARY KEY (sharing_profile_id, attribute_name)
);

CREATE TABLE IF NOT EXISTS guacamole_entity_permission (
    entity_id INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    affected_entity_id INTEGER NOT NULL REFERENCES guacamole_entity(entity_id) ON DELETE CASCADE,
    permission VARCHAR(32) NOT NULL,
    PRIMARY KEY (entity_id, affected_entity_id, permission)
);

CREATE TABLE IF NOT EXISTS guacamole_connection_history (
    history_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES guacamole_user(user_id) ON DELETE SET NULL,
    username VARCHAR(128) NOT NULL,
    remote_host VARCHAR(256),
    connection_id INTEGER REFERENCES guacamole_connection(connection_id) ON DELETE SET NULL,
    connection_name VARCHAR(128) NOT NULL,
    sharing_profile_id INTEGER REFERENCES guacamole_sharing_profile(sharing_profile_id) ON DELETE SET NULL,
    sharing_profile_name VARCHAR(128),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP
);

INSERT INTO guacamole_entity (name, type)
VALUES ('guacadmin', 'USER')
ON CONFLICT (name, type) DO NOTHING;

INSERT INTO guacamole_user (username, password_hash, password_salt, password_date)
VALUES (
    'guacadmin',
    decode('CA458A7D494E3BE824F5E1E175A1556C0F8EEF2C2D7DF3633BEC4A29C4411960', 'hex'),
    decode('FE24ADC5E11E2B25288D2293149704A9', 'hex'),
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

INSERT INTO guacamole_system_permission (user_id, permission)
SELECT user_id, permission
FROM guacamole_user
CROSS JOIN (VALUES
    ('CREATE_CONNECTION'),
    ('CREATE_CONNECTION_GROUP'),
    ('CREATE_SHARING_PROFILE'),
    ('CREATE_USER'),
    ('ADMINISTER')
) AS permissions(permission)
WHERE username = 'guacadmin'
ON CONFLICT DO NOTHING;

INSERT INTO guacamole_user_permission (user_id, affected_user_id, permission)
SELECT user_id, user_id, 'ADMINISTER'
FROM guacamole_user
WHERE username = 'guacadmin'
ON CONFLICT DO NOTHING;
