# QuickNotes API Design

A REST API for QuickNotes. All requests and responses use JSON. Resources are nouns (`/notes`), HTTP methods express the action, and status codes report the result. Protected endpoints need the header `Authorization: Bearer <token>`.

## Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | GET | `/notes` | List the signed-in user's notes (supports `?page=`, `?limit=` and `?tag=`) | 200 OK |
| 2 | GET | `/notes/{id}` | Get one note by id | 200 OK |
| 3 | POST | `/notes` | Create a new note | 201 Created |
| 4 | PUT | `/notes/{id}` | Replace a note (title and body) | 200 OK |
| 5 | PATCH | `/notes/{id}` | Update part of a note (for example only the title) | 200 OK |
| 6 | DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| 7 | GET | `/tags` | List all tags | 200 OK |
| 8 | POST | `/notes/{id}/tags` | Attach a tag to a note | 201 Created |

## Request and response examples

### Create a note: `POST /notes`

Request body:

```json
{
  "title": "Buy groceries",
  "body": "Milk, eggs and bread",
  "tags": ["personal"]
}
```

Response: `201 Created`

```json
{
  "id": 101,
  "title": "Buy groceries",
  "body": "Milk, eggs and bread",
  "tags": ["personal"],
  "userId": 1,
  "createdAt": "2026-10-13T16:45:00Z"
}
```

### List notes: `GET /notes?limit=2`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 101,
      "title": "Buy groceries",
      "body": "Milk, eggs and bread",
      "tags": ["personal"],
      "createdAt": "2026-10-13T16:45:00Z"
    },
    {
      "id": 100,
      "title": "Finish report",
      "body": "Send to manager by Friday",
      "tags": ["work"],
      "createdAt": "2026-10-12T09:10:00Z"
    }
  ],
  "page": 1,
  "limit": 2,
  "total": 57
}
```

## Error status codes

| Status | Meaning | When it happens |
|--------|---------|-----------------|
| 400 Bad Request | The request is invalid | `POST /notes` with an empty title or a title over 100 characters |
| 401 Unauthorized | Not signed in | The `Authorization` header is missing or the token has expired |
| 403 Forbidden | Signed in but not allowed | Deleting or editing a note that belongs to another user |
| 404 Not Found | The resource does not exist | `GET /notes/9999` when no note has that id |
| 500 Internal Server Error | The server failed | An unexpected crash, such as the database being unreachable |

Example error body (`400 Bad Request`):

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be 100 characters or fewer."
  }
}
```
