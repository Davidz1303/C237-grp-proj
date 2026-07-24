-- ================================================================
-- database.sql — DreamStay Hotel & Suites Database Schema & Seed Data
-- C237 Software Application Development — CA2
-- ================================================================
-- HOW TO USE:
--   1. Open phpMyAdmin (via XAMPP) or MySQL Workbench
--   2. Create a new database called `DreamStay Hotel`
--   3. Run this entire file
-- ================================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS DreamStay Hotel;
USE DreamStay Hotel;

-- ── Drop tables if they exist (for clean re-runs) ─────────────
-- Drop in reverse dependency order to avoid foreign key errors
DROP TABLE IF EXISTS testimonials;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- ================================================================
-- TABLE: users
-- Stores all registered accounts (guests and admins)
-- Functional Expectation #1 — User Access & Identity
-- Functional Expectation #2 — User Roles
-- ================================================================
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,  -- Unique user ID
  full_name  VARCHAR(100)  NOT NULL,           -- Display name
  email      VARCHAR(150)  NOT NULL UNIQUE,    -- Login email (must be unique)
  password   VARCHAR(255)  NOT NULL,           -- bcrypt-hashed password
  phone      VARCHAR(20)   DEFAULT NULL,       -- Optional contact number
  bio        TEXT          DEFAULT NULL,       -- Personalisation: user bio
  avatar     VARCHAR(255)  DEFAULT NULL,       -- Personalisation: profile photo path
  role       ENUM('guest','admin') DEFAULT 'guest', -- Role-based access control
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- TABLE: rooms
-- The main hotel resource — Functional Expectation #3
-- ================================================================
CREATE TABLE rooms (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  room_name        VARCHAR(100)  NOT NULL,          -- e.g. "Oceanview Deluxe"
  room_type        ENUM('Standard','Deluxe','Suite') NOT NULL,
  price_per_night  DECIMAL(10,2) NOT NULL,          -- Price in SGD
  capacity         INT           NOT NULL DEFAULT 2, -- Max guests
  description      TEXT          DEFAULT NULL,
  amenities        TEXT          DEFAULT NULL,       -- Comma-separated list
  image_url        VARCHAR(255)  DEFAULT '/images/room-placeholder.jpg',
  is_available     TINYINT(1)    DEFAULT 1,          -- 1 = available, 0 = hidden
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- TABLE: bookings
-- Links users to rooms — CRUD Resource (Functional Expectation #3)
-- ================================================================
CREATE TABLE bookings (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT           NOT NULL,
  room_id          INT           NOT NULL,
  check_in         DATE          NOT NULL,
  check_out        DATE          NOT NULL,
  guests           INT           NOT NULL DEFAULT 1,
  special_requests TEXT          DEFAULT NULL,   -- Personalisation: user requests
  total_price      DECIMAL(10,2) NOT NULL,
  status           ENUM('pending','confirmed','checked_in','completed','cancelled')
                   DEFAULT 'pending',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys link bookings to the correct user and room
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- ================================================================
-- TABLE: reviews
-- Guests can rate and comment on rooms they stayed in
-- ================================================================
CREATE TABLE reviews (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  room_id    INT NOT NULL,
  rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),  -- 1–5 stars
  comment    TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- A user can only review a room once
  UNIQUE KEY unique_review (user_id, room_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- ================================================================
-- TABLE: testimonials
-- Homepage + Guest Stories page (/testimonials) — CRUD resource
-- owned by Person 2. Guests share one quote + star rating each;
-- resubmitting is handled as an edit, not a duplicate row.
-- ================================================================
CREATE TABLE testimonials (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  quote      VARCHAR(400) NOT NULL,
  rating     TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY unique_testimonial (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================================================
-- SEED DATA — Default accounts and sample rooms
-- ================================================================

-- Admin account — password: admin123
-- bcrypt hash of "admin123" (10 salt rounds)
INSERT INTO users (full_name, email, password, phone, role, bio) VALUES
('Admin Manager', 'admin@dreamstayhotel.com',
 '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 '+65 9000 0001', 'admin',
 'Hotel operations manager with 10 years of hospitality experience.');

-- Guest account — password: guest123
INSERT INTO users (full_name, email, password, phone, role, bio) VALUES
('Jane Tan', 'jane@email.com',
 '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 '+65 9123 4567', 'guest',
 'Travel enthusiast who loves discovering new places.');

-- NOTE: The hash above maps to the password "password" (bcrypt default test hash).
-- For real seeding, generate fresh hashes using: bcrypt.hash('yourpassword', 10)

-- Sample rooms
INSERT INTO rooms (room_name, room_type, price_per_night, capacity, description, amenities, image_url) VALUES
('Garden View Standard', 'Standard', 120.00, 2,
 'A cosy, well-appointed room overlooking our lush garden courtyard. Perfect for solo travellers or couples seeking comfort at a great value.',
 'Free WiFi, Air Conditioning, Flat-screen TV, Mini-fridge, Safe, Room Service',
 '/images/room-standard.jpg'),

('Harbour Deluxe', 'Deluxe', 220.00, 2,
 'Enjoy breathtaking harbour views from your private balcony. Features a king-size bed, marble bathroom, and premium toiletries.',
 'Free WiFi, Air Conditioning, Flat-screen TV, Mini-bar, Balcony, Bathtub, Safe, Room Service, Nespresso Machine',
 '/images/room-deluxe.jpg'),

('Presidential Suite', 'Suite', 480.00, 4,
 'The pinnacle of luxury. This two-room suite features a separate living area, panoramic city views, a Jacuzzi, and dedicated butler service.',
 'Free WiFi, Air Conditioning, 2× Flat-screen TV, Full Bar, Separate Living Room, Jacuzzi, Butler Service, Airport Transfer, Daily Breakfast',
 '/images/room-suite.jpg'),

('Family Deluxe', 'Deluxe', 280.00, 4,
 'Designed for families, this spacious room features two queen beds, a kids'' entertainment corner, and easy access to the pool.',
 'Free WiFi, Air Conditioning, 2× Flat-screen TV, Mini-fridge, Kids Corner, Pool Access, Room Service',
 '/images/room-family.jpg'),

('Skyline Standard', 'Standard', 150.00, 2,
 'Modern city-facing room on the upper floors with stunning skyline views. Features a walk-in shower and contemporary décor.',
 'Free WiFi, Air Conditioning, Flat-screen TV, Walk-in Shower, Safe, Room Service',
 '/images/room-skyline.jpg');

-- Sample booking for jane@email.com (user id 2, room id 1)
INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, special_requests, total_price, status) VALUES
(2, 1, '2026-08-01', '2026-08-04', 2, 'Early check-in requested, non-smoking floor preferred.', 360.00, 'confirmed'),
(2, 2, '2026-09-10', '2026-09-12', 2, NULL, 440.00, 'pending');

-- Sample reviews
INSERT INTO reviews (user_id, room_id, rating, comment) VALUES
(2, 1, 5, 'Absolutely loved the garden view! The room was spotless and the staff were incredibly friendly. Will definitely return.');

-- Sample testimonial (shown on the homepage + Guest Stories page)
INSERT INTO testimonials (user_id, quote, rating) VALUES
(2, 'DreamStay Hotel redefined what a hotel stay means to me. The attention to detail, the warmth of the staff, and the sheer elegance of the rooms made this the best stay I have had in years.', 5);
