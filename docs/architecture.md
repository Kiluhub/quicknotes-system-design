# QuickNotes Architecture

## Requirements

### Functional
- Users can sign up and log in.
- Users can create, view, edit and delete their notes.
- Users can add tags to notes and filter notes by tag.
- Users can list their notes with pagination.

### Non-functional
- **Availability:** 99.9% uptime, with no single point of failure.
- **Performance:** the notes list responds in under 300 ms for most requests.
- **Scalability:** supports 1 million users and can grow by adding servers.
- **Durability:** notes are never lost (replicated database and backups).
- **Security:** HTTPS everywhere, authenticated access, and users can only see their own notes.

## Load estimate for 1 million users

**Assumptions:** 1,000,000 registered users, 10% active per day (100,000 daily active users), each active user views their notes list 20 times a day and creates 2 notes a day, peak traffic is 5x the average, one note is about 1 KB, and there are 86,400 seconds in a day.

| Measure | Calculation | Result |
|---------|-------------|--------|
| Reads per day | 100,000 x 20 | 2,000,000 |
| Reads per second (average) | 2,000,000 / 86,400 | about 23 /s |
| Reads per second (peak, 5x) | 23 x 5 | about 116 /s |
| Writes per day | 100,000 x 2 | 200,000 |
| Writes per second (average) | 200,000 / 86,400 | about 2.3 /s |
| Writes per second (peak, 5x) | 2.3 x 5 | about 12 /s |
| New notes per year | 200,000 x 365 | 73,000,000 |
| Storage per year | 73,000,000 x 1 KB | about 73 GB (about 100 GB with indexes) |

The system is **read-heavy**, with about 10 reads for every write. The numbers are small enough that a handful of servers handle them, but the design below leaves room to grow.

## Architecture diagram

```text
                        +----------------------+
                        |  Client (web/mobile) |
                        +----------------------+
                                   |
                                   v
                        +----------------------+
                        |         DNS          |
                        +----------------------+
                                   |
                  static files     |     API requests
                 +-----------------+------------------+
                 v                                    v
          +-------------+                     +---------------+
          |     CDN     |                     | Load Balancer |
          +-------------+                     +---------------+
                                                 |          |
                                                 v          v
                                         +-----------+ +-----------+
                                         | App       | | App       |
                                         | Server 1  | | Server 2  |
                                         +-----------+ +-----------+
                                            |   |   |       |
                      +---------------------+   |   +-------+------------+
                      v                         v                        v
                 +---------+          +------------------+        +-----------+
                 |  Cache  |          | Primary Database |        |   Queue   |
                 +---------+          +------------------+        +-----------+
                                               |                        |
                                   replication |                        v
                                               v                  +-----------+
                                      +------------------+        |  Worker   |
                                      |  Read Replica    |        +-----------+
                                      +------------------+
```

## What each component does

- **Client:** The browser or mobile app where the user reads and writes notes.
- **DNS:** Turns the name `quicknotes.example` into the address of our load balancer or CDN, so users can find us and traffic can be redirected if a server fails.
- **CDN:** Serves static files (HTML, CSS, JavaScript) from servers close to the user, so pages load fast and our servers carry less traffic.
- **Load balancer:** Spreads requests across several app servers and stops sending traffic to a server that is down.
- **App servers (two or more):** Run the API logic (login, validation, notes) and are stateless, so we can add more when traffic grows.
- **Cache:** Keeps frequently read data, such as a user's recent notes, in fast memory so most reads never reach the database.
- **Primary database:** Stores users, notes and tags reliably and handles all writes.
- **Read replica:** A live copy of the primary that answers read queries, which takes load off the primary because the system is read-heavy.
- **Queue:** Holds background jobs (such as sending emails or updating search data) so the API can reply quickly instead of waiting for slow work.
- **Worker:** Takes jobs from the queue and runs them in the background, retrying if one fails.

## Request flows

### GET /notes
1. The client sends `GET /notes` with its token. DNS resolves the address.
2. The request reaches the **load balancer**, which picks a healthy **app server**.
3. The app server checks the token. If invalid, it returns **401**.
4. The app server looks in the **cache** for this user's notes.
5. **Cache hit:** it returns the notes immediately with **200 OK**.
6. **Cache miss:** it queries the **read replica**, stores the result in the cache with an expiry time, and returns **200 OK**.

### POST /notes
1. The client sends `POST /notes` with a JSON body and its token.
2. The **load balancer** forwards it to an **app server**.
3. The app server checks the token (**401** if invalid) and validates the body: a title is required and at most 100 characters (**400** if not).
4. The app server inserts the note into the **primary database**.
5. The app server deletes that user's cached notes list, so the next read is fresh.
6. The app server puts a background job on the **queue** (for example, update search data).
7. The app server returns **201 Created** with the new note, without waiting for the job.
8. A **worker** takes the job from the queue and processes it, retrying on failure.

## Trade-offs

1. **Caching: speed vs. freshness.** The cache makes reads fast and protects the database, but cached data can be slightly out of date, and we must clear the cache on every write. We accept a short delay for much better speed.
2. **Read replica: read capacity vs. consistency.** Replicas let us serve many reads, but they copy data with a small delay, so a user may briefly not see a note they just created. We reduce this by reading from the primary right after a write.
3. **Queue and worker: fast responses vs. complexity.** Background jobs keep the API quick, but the work finishes slightly later and we have an extra system to run and monitor.

## Avoiding single points of failure

- **DNS and CDN:** use managed providers that run in many locations.
- **Load balancer:** run more than one (or use a managed, redundant one).
- **App servers:** at least two, in different zones. The load balancer's health checks remove a failed server automatically.
- **Cache:** run a cluster with a replica, and the app still works without it by reading from the database.
- **Database:** the primary has a read replica that can be promoted to primary if the primary fails, plus regular backups.
- **Queue and workers:** use a durable queue and several workers, so a failed job is retried by another worker.
