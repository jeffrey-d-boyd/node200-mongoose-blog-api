/**
 * Verifies a MongoDB connection string end to end: connects, writes a document,
 * reads it back, and removes it. Use it to check an Atlas URI before wiring it
 * into Render.
 *
 *   npm run check-db                        # uses MONGODB_URI, or the local default
 *   npm run check-db -- "<connection uri>"
 */
const mongoose = require('mongoose');

const uri = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost/my-blog';

// Never echo the password back to the terminal
const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

const CheckSchema = new mongoose.Schema({ ranAt: Date });
const Check = mongoose.model('ConnectionCheck', CheckSchema);

console.log(`Connecting to ${safeUri}`);

mongoose.set('strictQuery', true);

mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        const { host, name } = mongoose.connection;

        console.log(`Connected to host ${host}, database "${name}"`);

        if (!name || name === 'test') {
            console.log('Note: no database name in the URI, so MongoDB defaulted to "test".');
            console.log('      Add one before the query string, e.g. .../my-blog?retryWrites=true');
        }

        return new Check({ ranAt: new Date() }).save();
    })
    .then(doc => {
        console.log('Write OK');

        return Check.findById(doc._id);
    })
    .then(doc => {
        console.log('Read OK');

        return Check.deleteOne({ _id: doc._id });
    })
    .then(() => {
        console.log('Delete OK');
        console.log('\nConnection string works. Safe to set as MONGODB_URI on Render.');

        return mongoose.disconnect();
    })
    .catch(err => {
        console.error(`\nFAILED: ${err.message}\n`);

        const hint = {
            'Authentication failed': 'Wrong username/password. If the password contains @ : / ? # or %, percent-encode it (@ becomes %40).',
            'ENOTFOUND': 'The hostname could not be resolved. Check for a typo, and that you copied the "mongodb+srv://" string.',
            'timed out': 'Could not reach the cluster. In Atlas, check Network Access allows your IP (0.0.0.0/0 for Render).',
            'ECONNREFUSED': 'Nothing is listening there. If this is a local URI, start MongoDB first.'
        };

        const match = Object.keys(hint).find(key => err.message.includes(key));

        if (match) {
            console.error(`Likely cause: ${hint[match]}\n`);
        }

        return mongoose.disconnect().then(() => process.exit(1));
    });
