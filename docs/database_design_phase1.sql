-- Phase 1 Database Schema (v3): Foundation + RT/Manager Registration
-- v2 change: users is a true global identity (1 row per real person).
-- v3 change: dropped otp_codes (auth uses Laravel starter kit email+password,
-- not OTP). Added 'unclaimed' area status + created_by, and manual complex
-- entry support (nullable google_place_id + source column).
-- Target: MySQL

CREATE TABLE complexes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    google_place_id VARCHAR(255) NULL,
    source ENUM('google', 'manual') NOT NULL DEFAULT 'google',
    name VARCHAR(255) NOT NULL,
    formatted_address VARCHAR(500) NULL,
    -- province_code/city_code reference laravolt/indonesia's existing tables.
    -- No FK constraint added here — verify the exact table/column names in
    -- that package's own migration before wiring one up, don't assume.
    province_code VARCHAR(20) NULL,
    city_code VARCHAR(20) NULL,
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_complexes_google_place_id (google_place_id)
);

CREATE TABLE areas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    complex_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('rt_self_managed', 'paid_manager', 'developer') NOT NULL DEFAULT 'rt_self_managed',
    status ENUM('unclaimed', 'active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    require_approval BOOLEAN NOT NULL DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_areas_complex_id (complex_id),
    CONSTRAINT fk_areas_complex FOREIGN KEY (complex_id) REFERENCES complexes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_areas_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- USERS is now a true global identity: one row per real human, full stop.
-- No area_id, no complex_id, no role, no approval status here anymore —
-- those are all contextual to a specific area and live in area_members.
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(255) NULL,
    password VARCHAR(255) NULL,
    phone_verified_at TIMESTAMP NULL DEFAULT NULL,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_users_phone (phone),
    UNIQUE KEY uq_users_email (email)
);

-- Simple role catalog. Seed with: superadmin, staff, security, resident.
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key_name VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_roles_key_name (key_name)
);

-- The core fix: one real person (user_id) can hold a role in MANY areas.
-- Approval status lives HERE, per membership — not on the global user —
-- because the same person can be 'active' in one area and 'pending_approval'
-- in another at the same time.
CREATE TABLE area_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    area_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending_approval', 'active', 'rejected', 'suspended') NOT NULL DEFAULT 'pending_approval',
    approved_by BIGINT UNSIGNED NULL,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_area_members (area_id, user_id, role_id),
    CONSTRAINT fk_tm_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tm_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    area_id BIGINT UNSIGNED NOT NULL,
    complex_id BIGINT UNSIGNED NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    block VARCHAR(50) NULL,
    normalized_address VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_units_complex_address (complex_id, normalized_address),
    CONSTRAINT fk_units_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_units_complex FOREIGN KEY (complex_id) REFERENCES complexes(id) ON DELETE RESTRICT
);

-- Unchanged in spirit: links a real person to a house they own/live in.
-- user_id now points to the single global users row (no more duplicates).
CREATE TABLE unit_user (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    unit_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    relation ENUM('owner', 'renter', 'family') NOT NULL DEFAULT 'owner',
    status ENUM('pending', 'active', 'declined') NOT NULL DEFAULT 'active',
    confirmed_by BIGINT UNSIGNED NULL,
    confirmed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_unit_user (unit_id, user_id),
    CONSTRAINT fk_unit_user_unit FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_user_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_unit_user_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE invites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    area_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    code VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM('active', 'expired', 'revoked') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY uq_invites_code (code),
    CONSTRAINT fk_invites_area FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE,
    CONSTRAINT fk_invites_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Seed data for the roles catalog
INSERT INTO roles (key_name, label, created_at, updated_at) VALUES
('superadmin', 'Super Admin', NOW(), NOW()),
('staff', 'Staff', NOW(), NOW()),
('security', 'Security / Guard', NOW(), NOW()),
('resident', 'Resident', NOW(), NOW());
