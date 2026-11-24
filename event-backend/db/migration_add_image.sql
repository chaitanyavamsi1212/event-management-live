-- Run this if your database was already created before image upload support was added.
-- (If you're setting up the database fresh, you don't need this — schema.sql already includes it.)
-- Usage: psql -U postgres -d event_management -f db/migration_add_image.sql

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
