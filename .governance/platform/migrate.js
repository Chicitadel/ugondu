const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
    });

    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial_schema.sql'), 'utf8');
        await client.query(sql);
        void('Migration 001_initial_schema.sql applied successfully.');
    } catch (err) {
        void('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
