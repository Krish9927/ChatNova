# ChatOps — Daily Build Guide
**Project: Real-time Chat App — Dockerised with CI/CD**
**Stack: Node.js + Socket.io + MongoDB + PostgreSQL + Redis + Docker + GitHub Actions**

---

## How to Use This File
This file explains:
- ✅ What the AI is doing each day
- 💥 What impact each change has on the app
- ❓ Why we are making that change
- 🔼 What upgrade or new feature is added
- 🎤 Interview Q&A relevant to that day's work
- 📋 Your external action checklist (what YOU must do manually)

---

---

# ✅ DAY 1 — COMPLETE
## PostgreSQL Setup & DB Schema Design

---

### 🔼 What Was Upgraded / Added

| File | Action | Purpose |
|---|---|---|
| `backend/src/lib/pg.js` | ✅ CREATED | PostgreSQL connection pool |
| `backend/src/lib/db-init.js` | ✅ CREATED | Auto-creates `messages` table + index on startup |
| `backend/src/lib/env.js` | ✅ MODIFIED | Added `DATABASE_URL` and `REDIS_URL` config |
| `backend/.env` | ✅ MODIFIED | Added local Postgres and Redis connection strings |
| `backend/src/server.js` | ✅ MODIFIED | Server now waits for both MongoDB + PostgreSQL before starting |
| `backend/package.json` | ✅ MODIFIED | Installed `pg`, `redis`, `@socket.io/redis-adapter` |

---

### 💥 Impact on App
- The server now connects to **two databases simultaneously** (MongoDB for users/auth, PostgreSQL for chat messages).
- If either database fails to connect, the server will **not start** and will print a clear error — this prevents silent data corruption.
- The `messages` table and index are **auto-created** on first boot. You never need to manually create them.

---

### ❓ Why We Did This
Your app already uses MongoDB which is great for flexible user documents. But for **chat messages** we need:
1. **Ordered, indexed queries** — `SELECT * WHERE room_id = X AND created_at < cursor` is extremely fast with PostgreSQL indexes. MongoDB requires manual compound index management.
2. **Cursor pagination** — Reading millions of messages page by page without duplicates is natively efficient in PostgreSQL.
3. **Portfolio impact** — Using Postgres for messages + MongoDB for users = **Polyglot Persistence**, which is rare for freshers and impresses hiring managers.

---

### 📋 Your External Actions (Day 1)
- [x] Confirm `pg`, `redis`, `@socket.io/redis-adapter` installed via `npm install`
- [x] Add `DATABASE_URL` to `.env` (local Postgres URL or Neon cloud URL)
- [x] Add `REDIS_URL` to `.env` (local Redis URL)
- [ ] **Optional:** Create a free PostgreSQL database on [Neon.tech](https://neon.tech) and replace `DATABASE_URL` in `.env`

---

### 🎤 Day 1 Interview Q&A

**Q1: Why did you use PostgreSQL for messages instead of MongoDB?**
> "MongoDB is great for flexible document storage like user profiles. But chat messages need ordered queries with cursor pagination — PostgreSQL's compound B-tree indexes make `WHERE room_id = X AND created_at < cursor ORDER BY created_at DESC` extremely efficient. MongoDB requires manual compound index management and doesn't enforce referential integrity at the database level."

**Q2: What is a connection pool and why is it important?**
> "A connection pool is a cache of pre-established database connections reused across requests. Opening a new DB connection for every request is expensive — it takes 20–100ms and consumes server resources. With a pool, connections are borrowed and returned, typically keeping 5–10 connections open. Under load, 1000 concurrent requests share those 10 connections rather than trying to open 1000 new ones simultaneously, which would crash the database."

**Q3: Why does your server wait for both MongoDB and PostgreSQL before starting?**
> "We use `Promise.all([connectDB(), initPostgresDB()])` so if either database fails to connect, the app crashes immediately with a clear error message rather than silently accepting requests it cannot fulfill. A server that starts but cannot write to its database is dangerous — it will appear healthy to health checks while silently dropping all user data."

**Q4: What is an index and why did you create one on (room_id, created_at DESC)?**
> "An index is a pre-sorted data structure the database maintains alongside a table, similar to a book's index. Without it, every chat history query scans every row in the messages table — O(n) time. With a compound index on (room_id, created_at DESC), PostgreSQL jumps directly to the correct room and reads messages in reverse chronological order — O(log n) time. For millions of messages, this is the difference between a 2ms query and a 2000ms query."

---

---

# 🔄 DAY 2 — IN PROGRESS
## Redis Presence Tracking & Socket.io Multi-Server Adapter
File	Action	What Changed
src/lib/redis.js
✅ CREATED	3 Redis clients: redisClient (presence), pubClient + subClient (socket adapter)
src/lib/socket.js
✅ REWRITTEN	Replaced in-memory userSocketMap → Redis SET user:online:<id> with 35s TTL + heartbeat refresh every 25s
src/server.js
✅ MODIFIED	Promise.all now boots MongoDB + PostgreSQL + Redis together, then attaches Redis adapter

---

### 🔼 What Will Be Upgraded / Added

| File | Action | Purpose |
|---|---|---|
| `backend/src/lib/redis.js` | ✅ CREATED | Redis client, pub client, sub client configuration |
| `backend/src/lib/socket.js` | ⬜ MODIFY | Add Redis adapter for multi-server sync + Redis presence tracking |
| `backend/src/server.js` | ⬜ MODIFY | Add `connectRedis()` to startup `Promise.all` block |

---

### 💥 Impact on App
- Your socket server will become **horizontally scalable** — multiple server instances can all share socket events through Redis.
- User online/offline presence will be stored in Redis with a **TTL (Time To Live)** so if a user disconnects abruptly (e.g. browser crash), they automatically appear offline after 30 seconds.
- The existing in-memory `userSocketMap` will be replaced by Redis, making presence data **survive server restarts**.

---

### ❓ Why We Are Doing This
Your current `socket.js` stores online users in a plain JavaScript object in memory:
```javascript
const userSocketMap = {}; // {userId: socketId}
```
This has 3 problems:
1. **Single server only** — If Render scales you to 2 instances, each has its own `userSocketMap`. User A on Server 1 cannot see User B on Server 2 as online.
2. **No persistence** — If the server restarts, all presence data is lost. Everyone appears offline until they manually reconnect.
3. **No auto-expiry** — If a user's browser crashes without firing a `disconnect` event, they are stuck as "online" forever.

Redis solves all three.

---

### 📋 Your External Actions (Day 2)
- [ ] Ensure Redis is running locally: `redis-server` (or it will run via Docker on Day 4)
- [ ] After implementation: run `npm run dev` and check console for `[redis] Connected to Redis successfully.`
- [ ] Open two browser tabs to verify that online presence updates in real-time

---

### 🎤 Day 2 Interview Q&A

**Q1: What is Redis Pub/Sub and how does it help Socket.io scale?**
> "Redis Pub/Sub is a messaging pattern where publishers send messages to named channels and subscribers receive them. The `@socket.io/redis-adapter` makes each server instance both publish and subscribe to a shared Redis channel. When Server 1 emits a socket event, it publishes to Redis. Redis broadcasts to Server 2 and Server 3. Each server checks its local connections and delivers the event to the correct socket. This makes multiple Node instances act as one unified server."

**Q2: Why use a TTL on Redis presence keys?**
> "A TTL (Time To Live) is an automatic expiry timer on a Redis key. We set online presence as: `SET user:online:userId '1' EX 30`. If a user disconnects cleanly, we delete the key immediately. If they disconnect abruptly (browser crash, power cut), no disconnect event fires — but the key expires automatically after 30 seconds. Without TTL, a crashed user would appear online forever, which breaks typing indicators, message routing, and presence badges."

**Q3: Why create separate pub and sub Redis clients?**
> "Redis protocol does not allow a connection in subscribe mode to send regular commands. Once you call `client.subscribe()`, that connection is dedicated to receiving messages only. So we create three clients: one for regular commands like `GET/SET` (presence), one dedicated to publishing socket events, and one dedicated to subscribing. This follows Redis's official documentation recommendation for the socket.io adapter."

**Q4: What is the difference between Socket.io rooms and Redis Pub/Sub channels?**
> "Socket.io rooms are a server-side grouping mechanism — a list of socket IDs that the server maintains in memory. When you emit to a room, the server delivers to all sockets in that list. Redis Pub/Sub channels are the inter-server broadcast layer. When the Redis adapter is active, emitting to a room publishes to a Redis channel first, then every server subscribes to that channel and delivers to its local room members. Rooms = who receives the message. Redis = how all servers synchronize."

---

---

# ⬜ DAY 3 — UPCOMING
## Socket Events, Cursor Pagination API & HTML Test Client

### What Will Be Added
- Socket events: `join_room`, `leave_room`, `send_message`, `typing_start`, `typing_stop`
- Server emits: `new_message`, `user_joined`, `user_left`, `presence_update`
- `GET /api/rooms/:id/messages?before=<cursor>` endpoint for infinite-scroll history
- Messages saved to PostgreSQL on every `send_message`
- Single-file `test-client.html` to test chat in two browser tabs

---

# ⬜ DAY 4 — UPCOMING
## Docker & Docker Compose

### What Will Be Added
- Multi-stage `Dockerfile` for the Node app (small, non-root, production-ready)
- `docker-compose.yml` starting app + PostgreSQL + Redis with one command
- Volume mounts for persistent Postgres data
- Healthchecks so the app waits for DB to be ready before connecting

---

# ⬜ DAY 5 — UPCOMING
## CI/CD with GitHub Actions & Deploy

### What Will Be Added
- `.github/workflows/ci.yml` — runs tests on every push to `main`
- Automatically deploys to Render on green tests via deploy hook
- README status badge showing live pipeline health
- Full walkthrough document

---

## 📚 Learning Resources by Technology

| Technology | Resource |
|---|---|
| **PostgreSQL** | [PostgreSQL Official Docs](https://www.postgresql.org/docs/) |
| **node-postgres (pg)** | [node-postgres.com](https://node-postgres.com/) |
| **Redis** | [Redis University (Free)](https://university.redis.com/) |
| **Socket.io Redis Adapter** | [socket.io/docs/v4/redis-adapter](https://socket.io/docs/v4/redis-adapter/) |
| **Docker** | [Docker Curriculum](https://docker-curriculum.com/) |
| **GitHub Actions** | [GitHub Actions Docs](https://docs.github.com/en/actions) |
| **Neon Postgres** | [Neon.tech Docs](https://neon.tech/docs) |
| **Render Deployment** | [Render Docs](https://render.com/docs) |

---

## 💬 How to Prompt the AI Each Day

### Day 2 Prompt:
> "Proceed with Day 2: Modify `src/lib/socket.js` to add the Redis adapter using `pubClient` and `subClient` from `redis.js`. Replace the in-memory `userSocketMap` with Redis SET commands with TTL for presence tracking. Then add `connectRedis()` to the server startup block."

### Day 3 Prompt:
> "Proceed with Day 3: Implement socket events join_room, leave_room, send_message, typing_start, typing_stop. Save messages to PostgreSQL on send_message. Create `GET /api/rooms/:id/messages?before=<cursor>` endpoint. Generate a single-file test-client.html."

### Day 4 Prompt:
> "Proceed with Day 4: Create a multi-stage Dockerfile and docker-compose.yml that runs the app, postgres, and redis with one command. Add healthchecks and volumes."

### Day 5 Prompt:
> "Proceed with Day 5: Create .github/workflows/ci.yml that runs tests with Postgres and Redis service containers, builds Docker image, and triggers Render deploy hook. Add README badges."
