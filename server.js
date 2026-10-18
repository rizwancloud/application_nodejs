require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

// Request logging middleware — register before routes
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        console.log(
            `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`
        );
    });

    next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(500).json({ status: 'error', db: err.message });
    }
});

// Get tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Failed to fetch tasks:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Create task
app.post('/api/tasks', async (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'title required' });
    }

    try {
        const [r] = await pool.query(
            'INSERT INTO tasks (title) VALUES (?)',
            [title]
        );

        res.status(201).json({ id: r.insertId, title, done: false });
    } catch (err) {
        console.error('Failed to create task:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query(
            'UPDATE tasks SET done = NOT done WHERE id = ?',
            [req.params.id]
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('Failed to update task:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM tasks WHERE id = ?',
            [req.params.id]
        );

        res.json({ ok: true });
    } catch (err) {
        console.error('Failed to delete task:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 4000;

app.listen(port, '0.0.0.0', () => {
    console.log(`App running on port ${port}`);
});
