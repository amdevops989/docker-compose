const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

// Enable CORS so the local frontend can talk to the backend safely
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  
  // Intercept OPTIONS method (the preflight check) and send back a quick 200 OK
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
// Configure connection to PostgreSQL using variables injected at runtime
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// Initialize table on startup
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
};
initDb().catch(console.error);

// CRUD: Read
app.get('/items', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM inventory ORDER BY id DESC');
  res.json(rows);
});

// CRUD: Create
app.post('/items', async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query('INSERT INTO inventory (name) VALUES ($1) RETURNING *', [name]);
  res.json(rows[0]);
});

// CRUD: Delete
app.delete('/items/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM inventory WHERE id = $1', [id]);
  res.json({ success: true, message: `Item ${id} deleted successfully.` });
});

app.listen(3000, () => console.log('Backend running on port 3000'));