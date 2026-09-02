# Mongoose Blog API

A REST API for a blog website, built with Express and Mongoose on top of MongoDB.
It exposes CRUD endpoints for `User` and `Blog` documents, which are related to
each other one-to-many: a `User` has many `Blog`s, and a `Blog` has one author.

## Requirements

- Node.js
- A running MongoDB instance (local, or a MongoDB Atlas cluster)

## Getting started

```bash
npm install
npm start
```

The server listens on `http://localhost:8080` by default and connects to the
`my-blog` database on your local MongoDB instance.

### Configuration

Both settings are read from the environment, so the same code runs locally and
in production:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Port the HTTP server binds to |
| `MONGODB_URI` | `mongodb://localhost/my-blog` | MongoDB connection string |

To point the app at MongoDB Atlas instead of a local database, set
`MONGODB_URI` to the cluster's connection string — no code changes needed.

## Running the tests

```bash
npm test
```

The suite talks to a real database, so MongoDB must be running first.

## Checking a connection string

Before pointing the app at a new database, you can verify the connection string
end to end - it connects, writes a document, reads it back, and removes it:

```bash
npm run check-db                        # uses MONGODB_URI, or the local default
npm run check-db -- "<connection uri>"  # checks a specific string
```

On failure it reports the likely cause (bad credentials, unresolved host,
blocked IP). Passwords are redacted from its output.

## Data model

### User

| Field | Type | Required |
| --- | --- | --- |
| `firstName` | String | yes |
| `lastName` | String | yes |
| `email` | String | yes |
| `social.facebook` | String | no |
| `social.twitter` | String | no |
| `social.linkedIn` | String | no |
| `blogs` | [ObjectId] (ref `Blog`) | no |

### Blog

| Field | Type | Required |
| --- | --- | --- |
| `title` | String | yes |
| `article` | String | yes |
| `published` | Date | yes |
| `featured` | Boolean | yes |
| `author` | ObjectId (ref `User`) | no |

## API

### Users

| Verb | Route | Description | Success |
| --- | --- | --- | --- |
| GET | `/api/users` | Get all users | `200` + array |
| GET | `/api/users/:id` | Get a single user | `200` + user |
| POST | `/api/users` | Create a user | `201` + user |
| PUT | `/api/users/:id` | Update a user | `204` |
| DELETE | `/api/users/:id` | Delete a user | `200` + deleted user |

### Blogs

| Verb | Route | Description | Success |
| --- | --- | --- | --- |
| GET | `/api/blogs` | Get all blogs | `200` + array |
| GET | `/api/blogs/featured` | Get featured blogs only | `200` + array |
| GET | `/api/blogs/:id` | Get a single blog | `200` + blog |
| POST | `/api/blogs` | Create a blog and link it to its author | `201` + blog |
| PUT | `/api/blogs/:id` | Update a blog | `204` |
| DELETE | `/api/blogs/:id` | Delete a blog | `200` + deleted blog |

Errors: a missing document (or an id that isn't a valid ObjectId) returns `404`;
a document that fails schema validation returns `400`.

### Creating a blog

`POST /api/blogs` expects the author's id in the body as `author` (`authorId`
is accepted too). The route looks the user up, saves the blog with the user's id
as its `author`, then pushes the new blog onto that user's `blogs` array, so
both documents end up referencing each other.

```bash
curl -X POST http://localhost:8080/api/blogs \
  -H 'Content-Type: application/json' \
  -d '{
        "title": "Hello World",
        "article": "The first program you ever write.",
        "published": "2026-09-01",
        "featured": true,
        "author": "<user id>"
      }'
```

Deleting a blog also pulls its id back out of the author's `blogs` array, so the
relationship stays consistent in both directions.

## Project structure

```
server/
  app.js            Express app: DB connection, middleware, routes, error handling
  index.js          HTTP entry point
  models/
    User.js
    Blog.js
  routes/
    users.js
    blogs.js
test/               Mocha/Chai specs for the models and routes
```

## Deployment

1. Create a MongoDB Atlas free-tier cluster and copy its connection string.
2. Create a Render web service pointing at this repository, with build command
   `npm install` and start command `npm start`.
3. On Render, set the `MONGODB_URI` environment variable to the Atlas
   connection string. (`PORT` is provided by Render automatically.)
4. Connect the repository to CircleCI. `.circleci/config.yml` installs
   dependencies and runs the test suite against a MongoDB service container; on
   a green build of `main` it calls the Render deploy hook stored in the
   `RENDER_DEPLOY_HOOK_URL` environment variable. Until that variable is set in
   the CircleCI project, the deploy job logs a notice and exits without
   deploying, so the pipeline stays green before Render exists.

## Notes

This project uses Mongoose 6. The `useMongoClient` option shown in older
tutorials belonged to Mongoose 4 and is no longer accepted — `mongoose.connect(uri)`
now applies those defaults on its own.
