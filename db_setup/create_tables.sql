-- Drop the table if it exists, for easier re-running of the script during development (optional)
-- DROP TABLE IF EXISTS services;

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_string VARCHAR(100),
    description TEXT,
    category VARCHAR(100) DEFAULT 'Regular',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to use the function (if the table was just created)
-- If the table already exists and you want to add this trigger, you might need to drop an old one first.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_services') THEN
        CREATE TRIGGER set_timestamp_services
        BEFORE UPDATE ON services
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

-- You can add more tables here in the future

\echo 'Table "services" (and updated_at trigger) created successfully or already exists.';-- Drop the table if it exists, for easier re-running of the script during development (optional)
-- DROP TABLE IF EXISTS services;

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_string VARCHAR(100),
    description TEXT,
    category VARCHAR(100) DEFAULT 'Regular',
    sort_order INTEGER,                  -- <<< ADD THIS LINE HERE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add a function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to use the function (if the table was just created)

-- If the table already exists and you want to add this trigger, you might need to drop an old one first.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp_services') THEN
        CREATE TRIGGER set_timestamp_services
        BEFORE UPDATE ON services
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_timestamp();
    END IF;
END $$;

-- You can add more tables here in the future

\echo 'Table "services" (and updated_at trigger) created successfully or already exists.';
