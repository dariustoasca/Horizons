const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const sql = require('mssql');
const dbConfig = require('./dbConfig');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to SQL Server
sql.connect(dbConfig, (err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Connected to database');
});

// Route to handle sign-up
app.post('/signup', async (req, res) => {
    const { name, email, username, password } = req.body;

    if (!name || !email || !username || !password) {
        return res.status(400).send('All fields are required');
    }

    try {
        const request = new sql.Request();
        const query = 'INSERT INTO users (name, email, username, password) VALUES (@name, @Email, @Username, @Password)';
        request.input('Name', sql.NVarChar, name);
        request.input('Email', sql.NVarChar, email);
        request.input('Username', sql.NVarChar, username);
        request.input('Password', sql.NVarChar, password);

        await request.query(query);
        res.redirect('/login'); // Redirect to login page after successful signup
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const request = new sql.Request();
        const query = 'SELECT * FROM users WHERE username = @Username AND password = @Password';
        request.input('Username', sql.NVarChar, username);
        request.input('Password', sql.NVarChar, password);

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            req.session.username = username;
            res.redirect('/main.html');
        } else {
            res.status(401).send('Invalid username or password');
        }
    } catch (err) {
        console.error('Error processing login:', err);
        res.status(500).send('Internal Server Error');
    }
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