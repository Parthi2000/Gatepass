import { Pool } from 'pg';

// Database connection with password authentication
const pool = new Pool({
  user: process.env.DB_USER || process.env.PGUSER || 'postgres',
  host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'postgres',
  password: '123',  // Using the PostgreSQL password
  port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully', res.rows[0]);
  }
});

export default pool;
