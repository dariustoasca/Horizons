const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sql = require('mssql');
const session = require('express-session');
const dbConfig = require('./dbConfig'); // Import the dbConfig from the provided file

const app = express();
const port = 3500; // Changed the port to 5500

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add this line to parse JSON payloads
app.use(session({
    secret: 'mysecret', 
    resave: false, 
    saveUninitialized: true 
}));

// Add this endpoint in server.js
app.post('/remove-all-choices', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'UPDATE users SET choice = NULL WHERE username = @username';
        await request.input('username', sql.NVarChar, req.session.username)
                     .query(query);

        res.json({ success: true });
    } catch (err) {
        console.error('Error removing all choices:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to handle contact form submission
app.post('/submit-contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'INSERT INTO ContactMessages (contact_name, contact_email, contact_message) VALUES (@name, @Email, @message)';
        await request.input('name', sql.NVarChar, name)
                     .input('Email', sql.NVarChar, email)
                     .input('message', sql.NVarChar, message)
                     .query(query);

        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error saving contact message:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Edit wishlist
// Route to remove a choice
app.post('/remove-choice', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const { destination } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        
        // Fetch current choices
        const result = await request
            .input('username', sql.NVarChar, req.session.username)
            .query('SELECT choice FROM users WHERE username = @username');

        if (result.recordset.length > 0) {
            const choices = result.recordset[0].choice.split(', ');
            const newChoices = choices.filter(choice => choice !== destination);

            // Update the choices
            const updateRequest = pool.request();
            await updateRequest
                .input('username', sql.NVarChar, req.session.username)
                .input('choices', sql.NVarChar, newChoices.join(', '))
                .query('UPDATE users SET choice = @choices WHERE username = @username');

            res.json({ success: true });
        } else {
            res.status(404).json({ message: 'No choices found' });
        }
    } catch (err) {
        console.error('Error removing choice:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to get choices for the summary page
app.get('/get-choices', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'SELECT choice FROM users WHERE username = @username';
        request.input('username', sql.NVarChar, req.session.username);

        const result = await request.query(query);
        const choices = result.recordset.length > 0 ? result.recordset[0].choice.split(', ') : [];

        res.json({ choices });
    } catch (err) {
        console.error('Error fetching choices:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to get profile data
app.get('/getProfile', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'SELECT name, email, username FROM users WHERE username = @username';
        request.input('username', sql.NVarChar, req.session.username);

        const result = await request.query(query);

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ message: 'Profile not found' });
        }
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to save choices
app.post('/save-choices', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const { choices } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'UPDATE users SET choice = @choices WHERE username = @username';
        await request.input('username', sql.NVarChar, req.session.username)
                     .input('choices', sql.NVarChar, choices.join(', '))
                     .query(query);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving choices:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to get summary of choices
app.get('/summary.html', (req, res) => {
    if (req.session.username) {
        res.sendFile(path.join(__dirname, 'summary.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Route to get choices for the summary page
app.get('/get-choices', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'SELECT choice FROM users WHERE username = @username';
        request.input('username', sql.NVarChar, req.session.username);

        const result = await request.query(query);
        const choices = result.recordset.length > 0 ? result.recordset[0].choice.split(', ') : [];

        res.json({ choices });
    } catch (err) {
        console.error('Error fetching choices:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to update profile data
app.post('/updateProfile', async (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Not logged in');
    }

    const { name, email, username, password } = req.body;

    // Log received data
    console.log('Received data:', { name, email, username, password });

    // Check for null or empty values for required fields
    if (!name || !email || !username || !password) {
        console.log('Validation failed:', { name, email, username, password });
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();
        const query = 'UPDATE users SET name = @name, email = @Email, username = @NewUsername, password = @Password WHERE username = @CurrentUsername';
        request.input('name', sql.NVarChar, name);
        request.input('Email', sql.NVarChar, email);
        request.input('NewUsername', sql.NVarChar, username);
        request.input('Password', sql.NVarChar, password);
        request.input('CurrentUsername', sql.NVarChar, req.session.username);

        const result = await request.query(query);

        if (result.rowsAffected[0] > 0) {
            req.session.username = username; // Update session with new username
            res.json({ success: true });
        } else {
            console.error('No rows affected. Update may have failed.');
            res.status(500).json({ success: false, message: 'Update failed. No rows affected.' });
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Connect to the database
sql.connect(dbConfig).then(pool => {
    if (pool.connecting) {
        console.log('Connecting to the database...');
    }
    if (pool.connected) {
        console.log('Connected to the database.');
    }

    // Signup route
    app.post('/signup', async (req, res) => {
        const { name, email, username, password } = req.body;
        try {
            await pool.request()
                .input('name', sql.NVarChar, name)
                .input('email', sql.NVarChar, email)
                .input('username', sql.NVarChar, username)
                .input('password', sql.NVarChar, password)
                .query('INSERT INTO Users (Name, Email, Username, Password) VALUES (@name, @email, @username, @password)');
            
            console.log('User signed up successfully:', username);
            res.redirect('/login.html');
        } catch (err) {
            console.error('Error during signup:', err);
            res.status(500).send('Internal Server Error');
        }
    });

    // Login route
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const result = await pool.request()
                .input('username', sql.NVarChar, username)
                .input('password', sql.NVarChar, password)
                .query('SELECT * FROM Users WHERE Username = @username AND Password = @password');
    
            if (result.recordset.length > 0) {
                req.session.username = username;
                res.redirect('/main.html');
            } else {
                res.redirect('/login.html?error=invalid');
            }
        } catch (err) {
            console.error('Error during login:', err);
            res.redirect('/login.html?error=server');
        }
    });

    // Serve the HTML files
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/signup.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'signup.html'));
    });

    app.get('/login.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'login.html'));
    });

    app.get('/main.html', (req, res) => {
        if (req.session.username) {
            res.sendFile(path.join(__dirname, 'main.html'));
        } else {
            res.redirect('/login.html');
        }
    });

    // Route to send the username
    app.get('/get-username', (req, res) => {
        if (req.session.username) {
            res.json({ username: req.session.username });
        } else {
            res.status(401).json({ message: 'Not logged in' });
        }
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });

}).catch(err => {
    console.error('Database connection failed:', err);
});
