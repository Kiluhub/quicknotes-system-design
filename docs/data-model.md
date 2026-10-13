# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / rule |
|--------|------|-----------|
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| created_at | TEXT (timestamp) | NOT NULL |

### notes
| Column | Type | Key / rule |
|--------|------|-----------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), NOT NULL |
| title | TEXT | NOT NULL, max 100 characters |
| body | TEXT | Optional |
| created_at | TEXT (timestamp) | NOT NULL |

### tags
| Column | Type | Key / rule |
|--------|------|-----------|
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL, UNIQUE |

### note_tags (join table)
| Column | Type | Key / rule |
|--------|------|-----------|
| note_id | INTEGER | Foreign key to notes(id), part of primary key |
| tag_id | INTEGER | Foreign key to tags(id), part of primary key |

## Relationships

- **users to notes: one-to-many.** One user can write many notes, but every note belongs to exactly one user (`notes.user_id`).
- **notes to tags: many-to-many.** A note can have many tags (work, urgent) and a tag can be used on many notes. A relational table cannot store a list in one column, so the join table `note_tags` splits it into two one-to-many relationships: one note has many `note_tags` rows, and one tag has many `note_tags` rows. The composite primary key (`note_id`, `tag_id`) prevents the same tag being attached to a note twice.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL CHECK (length(title) <= 100),
  body       TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
);
```

## Example queries

**1. All notes for one user, newest first**

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC;
```

**2. All notes with a given tag (uses JOIN)**

```sql
SELECT n.id, n.title, t.name AS tag
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE t.name = 'work';
```

**3. Number of notes per user (JOIN and GROUP BY)**

```sql
SELECT u.name, COUNT(n.id) AS note_count
FROM users u
LEFT JOIN notes n ON n.user_id = u.id
GROUP BY u.id, u.name;
```

## Index

```sql
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at);
```

**Reason:** the most common request is "show this user's notes, newest first" (`GET /notes`). Without an index the database scans every note of every user. This index finds one user's notes directly and already holds them in date order, so the query stays fast as the table grows to millions of rows.

## SQL or NoSQL?

I would choose **SQL**. The data is structured and strongly related: users own notes, and notes and tags form a many-to-many relationship. SQL enforces this with primary keys, foreign keys, `UNIQUE` and `CHECK` rules, so a note can never belong to a user who does not exist. It handles questions that cross tables, such as "all notes with the tag work", with a simple `JOIN`, and it gives reliable transactions. NoSQL suits flexible or changing data shapes and extreme write scale, but QuickNotes needs consistency and relationships more than that. If traffic grows very large, SQL can still scale with read replicas and caching.
