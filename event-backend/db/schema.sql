-- Run this once against your postgres database to create the schema
-- e.g. psql -U postgres -d event_management -f db/schema.sql

CREATE TYPE user_role AS ENUM ('student', 'organizer', 'admin');
CREATE TYPE payment_status AS ENUM ('not_required', 'pending', 'paid');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    -- organizers must be approved by admin before they can create events
    -- students and admin are auto-approved
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    venue VARCHAR(200) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    last_date_to_register TIMESTAMP NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0, -- 0 means free event
    image_url VARCHAR(500), -- path to event banner image, uploaded by organizer
    reminder_sent BOOLEAN NOT NULL DEFAULT FALSE, -- tracks the automatic 1-hour-before reminder
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_status payment_status NOT NULL DEFAULT 'not_required',
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);
