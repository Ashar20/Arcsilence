-- PostgreSQL initialization script for ArcSilence

-- Create database and user (already done via environment variables)
-- POSTGRES_DB: arcsilence
-- POSTGRES_USER: arcsilence

-- Set up extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create any necessary tables for the darkpool (if needed in future)
-- For now, the darkpool operates primarily on-chain, but this is ready for off-chain data

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial health record
INSERT INTO health_check (service_name, status) VALUES ('postgres', 'healthy');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_health_check_service ON health_check(service_name);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON health_check(status);

