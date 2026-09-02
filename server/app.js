const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Falls back to the local MongoDB instance when no connection string is supplied
// (MONGODB_URI is what points the deployed app at MongoDB Atlas).
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/my-blog';

mongoose.set('strictQuery', true);
mongoose.Promise = Promise;

// The catch matters: an unhandled rejection here would take the whole process
// down, so an unreachable database would look like a dead server rather than a
// connection problem.
mongoose
    .connect(MONGODB_URI)
    .catch(err => console.error(`MongoDB connection failed: ${err.message}`));

// Drops after the initial connect surface here instead
mongoose.connection.on('error', err => console.error(`MongoDB error: ${err.message}`));

const app = express();

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).json({
        name: 'Mongoose Blog API',
        endpoints: {
            health: '/health',
            users: '/api/users',
            blogs: '/api/blogs',
            featuredBlogs: '/api/blogs/featured'
        }
    });
});

// Reports whether the database is actually reachable, which a 500 from a data
// route cannot distinguish from a bug.
app.get('/health', (req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const { readyState, name } = mongoose.connection;
    const connected = readyState === 1;

    res.status(connected ? 200 : 503).json({
        status: connected ? 'ok' : 'degraded',
        database: states[readyState] || 'unknown',
        databaseName: name || null,
        // Reports only whether it is set - never the value, which holds credentials
        mongodbUriConfigured: Boolean(process.env.MONGODB_URI)
    });
});

app.use('/api/users', require('./routes/users'));
app.use('/api/blogs', require('./routes/blogs'));

// Unknown routes
app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Errors bubbled up from the routers via next(err)
app.use((err, req, res, next) => {
    // A malformed id can never match a document
    if (err.name === 'CastError') {
        return res.status(404).json({ message: 'Not found' });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message, errors: err.errors });
    }

    console.error(err);

    res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
