const express = require('express');
const router = express.Router();

const User = require('../models/User');

// GET /api/users - get all Users
router.get('/', (req, res, next) => {
    User
        .find()
        .then(users => res.status(200).json(users))
        .catch(next);
});

// GET /api/users/:id - get a single User
router.get('/:id', (req, res, next) => {
    User
        .findById(req.params.id)
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(user);
        })
        .catch(next);
});

// POST /api/users - create a User
router.post('/', (req, res, next) => {
    new User(req.body)
        .save()
        .then(user => res.status(201).json(user))
        .catch(next);
});

// PUT /api/users/:id - update a User
router.put('/:id', (req, res, next) => {
    User
        .findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(204).send();
        })
        .catch(next);
});

// DELETE /api/users/:id - delete a User
router.delete('/:id', (req, res, next) => {
    User
        .findByIdAndRemove(req.params.id)
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json(user);
        })
        .catch(next);
});

module.exports = router;
