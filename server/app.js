const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Falls back to the local MongoDB instance when no connection string is supplied
// (MONGODB_URI is what points the deployed app at MongoDB Atlas).
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/my-blog';

mongoose.set('strictQuery', true);
mongoose.connect(MONGODB_URI);
mongoose.Promise = Promise;

const app = express();

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.status(200).send();
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
