# QuickNotes System Design

QuickNotes is a note-taking service. This repository has two parts: a small browser API client that proves the front end can talk to a REST API (using the JSONPlaceholder practice API), and the design documents the backend team would use to build the real service.

## How to run the API client

1. Download or clone this repository.
2. Open `index.html` in any modern browser (no installation needed).
3. Click **Load notes** to fetch 10 notes (GET).
4. Fill in the form and click **Create note** to send a POST request.
5. Click **Delete** on a note to send a DELETE request.

The page shows loading, success, error and empty states, and checks that a title is entered and is 100 characters or fewer.

## Documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- **Fetch needs a manual status check.** `fetch` only fails on network problems, so I must check `response.ok` and throw an error myself to catch 404 and 500 responses.
- **Good UI covers every state.** Loading, success, error and empty states, plus disabled buttons during requests, make an app feel reliable.
- **A join table solves many-to-many.** Notes and tags are linked through `note_tags`, which keeps the data clean and queries simple.
- **Estimates guide the design.** Working out reads per second, writes per second and storage showed the system is read-heavy, which is why caching and a read replica matter.
- **Safe output matters.** Using `textContent` instead of `innerHTML` stops user text from running as code.
