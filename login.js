const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

const dbConfig = {
    host: '192.168.1.134',
    user: 'sa',
    password: 'VeryStr0ngP@ssw0rd',
    database: 'Horizons'
};

const conn = mysql.createConnection(dbConfig);

// Set up session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    conn.query(sql, [username, password], (err, results) => {
        if (err) {
            res.status(500).send('Error occurred while processing your request');
            return;
        }

        if (results.length > 0) {
            req.session.username = username;
            res.redirect('/main.html');
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

// Route to serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Route to serve the main page
app.get('/main.html', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});