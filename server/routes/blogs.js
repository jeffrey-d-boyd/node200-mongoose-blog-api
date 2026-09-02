const express = require('express');
const router = express.Router();

const Blog = require('../models/Blog');
const User = require('../models/User');

// GET /api/blogs - get all Blogs
router.get('/', (req, res, next) => {
    Blog
        .find()
        .then(blogs => res.status(200).json(blogs))
        .catch(next);
});

// GET /api/blogs/featured - get all featured Blogs
// NOTE: must be declared before /:id, otherwise 'featured' is read as an id
router.get('/featured', (req, res, next) => {
    Blog
        .find()
        .where('featured')
        .equals(true)
        .then(blogs => res.status(200).json(blogs))
        .catch(next);
});

// GET /api/blogs/:id - get a single Blog
router.get('/:id', (req, res, next) => {
    Blog
        .findById(req.params.id)
        .then(blog => {
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            res.status(200).json(blog);
        })
        .catch(next);
});

// POST /api/blogs - create a Blog and associate it to a User
router.post('/', (req, res, next) => {
    const authorId = req.body.author || req.body.authorId;

    // Held in a higher scope so the fetched user is reachable from the next .then()
    let dbUser = null;

    User
        .findById(authorId)
        .then(user => {
            if (!user) {
                return res.status(404).json({ message: 'Author not found' });
            }

            dbUser = user;

            const newBlog = new Blog(req.body);

            // Bind the user to the blog
            newBlog.author = user._id;

            return newBlog.save();
        })
        .then(blog => {
            // res.status(404) above returns the response object, not a blog
            if (!blog || !dbUser) {
                return;
            }

            // Add the blog to the user's collection of blogs
            dbUser.blogs.push(blog);

            return dbUser
                .save()
                .then(() => res.status(201).json(blog));
        })
        .catch(next);
});

// PUT /api/blogs/:id - update a Blog
router.put('/:id', (req, res, next) => {
    Blog
        .findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .then(blog => {
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            res.status(204).send();
        })
        .catch(next);
});

// DELETE /api/blogs/:id - delete a Blog
router.delete('/:id', (req, res, next) => {
    Blog
        .findByIdAndRemove(req.params.id)
        .then(blog => {
            if (!blog) {
                return res.status(404).json({ message: 'Blog not found' });
            }

            // Keep the author's list of blogs in sync
            return User
                .updateOne({ _id: blog.author }, { $pull: { blogs: blog._id } })
                .then(() => res.status(200).json(blog));
        })
        .catch(next);
});

module.exports = router;
