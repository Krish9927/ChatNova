# Prompting & External Actions Guide (ChatOps - Project 5)

This guide helps you understand the development process, what the AI is doing, how to run steps externally, how to prompt the AI for each daily task, and how to prepare for interviews.

> **📁 File Location:** `E:\ChatNova\ChatNova\PROMPTING_AND_EXTERNAL_GUIDE.md`

---

## 🌟 Daily 5-Day Plan & Script

```
Day 1 ✅ → Day 2 ✅ → Day 3 ✅ → Day 4 ⬜ → Day 5 ⬜
```

---

## ✅ Day 1 — COMPLETE
### Theory, Setup, and PostgreSQL Schema Design

**What the AI did:**
- Installed `pg`, `redis`, `@socket.io/redis-adapter` in `backend/package.json`
- Created `backend/src/lib/pg.js` — PostgreSQL connection pool
- Created `backend/src/lib/db-init.js` — Auto-creates `messages` table + index on startup
- Added `DATABASE_URL` and `REDIS_URL` to `backend/src/lib/env.js` and `backend/.env`
- Modified `backend/src/server.js` — Server now waits for MongoDB + PostgreSQL before starting

**What you (the user) did externally:**
- ✅ Confirmed `npm install` completed successfully
- ✅ Changed project folder location from `C:\Users\kusya\OneDrive\Desktop\ChatNova\ChatNova` → `E:\ChatNova\ChatNova`

**Technology explained:**
- **PostgreSQL:** Relational database with ACID compliance and powerful indexing — perfect for ordered, paginated chat history queries
- **Connection Pool (`pg`):** Reuses database connections instead of opening a new one per request — reduces latency from ~100ms to ~2ms per query
- **`CREATE INDEX IF NOT EXISTS`:** Auto-creates compound index `(room_id, created_at DESC)` — makes cursor pagination queries O(log n) instead of O(n)

**Resources:**
- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Node Postgres Guide (node-postgres.com)](https://node-postgres.com/)
- [Neon Serverless Postgres](https://neon.tech/docs) — free cloud Postgres alternative

**Prompt used to trigger Day 1:**
> "Proceed with Day 1 implementation: Install PostgreSQL dependencies, design the messages table, set up `src/lib/pg.js`, and write database bootstrap logic to create the table on startup. Connect it to the main server bootstrap."

---

## ✅ Day 2 — COMPLETE
### Redis Presence Tracking & Socket.io Multi-Server Adapter

**What the AI did:**
- Created `backend/src/lib/redis.js` — 3 Redis clients: `redisClient` (presence), `pubClient` + `subClient` (Socket.io adapter)
- Rewrote `backend/src/lib/socket.js`:
  - Replaced in-memory `userSocketMap = {}` with Redis `SET user:online:<userId>` with **35-second TTL**
  - Added heartbeat refresh every 25 seconds so active users never auto-expire
  - Integrated `@socket.io/redis-adapter` via `attachRedisAdapter()` for multi-server sync
  - `getReceiverSocketId(userId)` now reads from Redis instead of local memory
- Modified `backend/src/server.js`:
  - Added `connectRedis()` to the `Promise.all` startup block (MongoDB + PostgreSQL + Redis all connect before port opens)
  - Added `attachRedisAdapter()` call after all databases connect

**What you (the user) do externally:**
- [ ] Ensure Redis is running locally: run `redis-server` in a terminal, OR wait for Day 4 Docker setup
- [ ] After starting `npm run dev`, check console for `[redis] Connected to Redis successfully.`
- [ ] Git commit and push:
  ```bash
  git add .
  git commit -m "feat: add Redis adapter and presence tracking with TTL"
  git push
  ```

**Technology explained:**
- **Redis Pub/Sub Adapter:** When Server 1 emits a socket event, it publishes to a Redis channel. All other servers subscribed to that channel receive it and deliver to their local sockets. Multiple servers act as one.
- **TTL (Time To Live):** Redis auto-deletes the `user:online:X` key after 35 seconds. Prevents "ghost online" status when browsers crash without sending a disconnect event.
- **Heartbeat pattern:** Every 25 seconds, the server resets the TTL on the user's presence key. Active users stay online. Disconnected users expire naturally.
- **Why 3 Redis clients?** Redis protocol does not allow a subscribed connection to send commands. So we need: one for general commands (`SET/GET/DEL`), one for publishing, one for subscribing.

**Resources:**
- [Redis University — free courses](https://university.redis.com/)
- [Socket.io Redis Adapter Docs](https://socket.io/docs/v4/redis-adapter/)
- [Redis TTL/EXPIRE commands](https://redis.io/commands/expire/)

**Prompt used to trigger Day 2:**
> "Proceed with Day 2: Integrate `@socket.io/redis-adapter` using local Redis instances, set up Redis-based online/offline presence with TTL, and ensure the JWT cookie verification is hooked into the socket handshake."

---

## ✅ Day 3 — COMPLETE
### Socket Room Events, Cursor Pagination API & HTML Test Client

**What the AI will do:**
- Implement socket events: `join_room`, `leave_room`, `send_message`, `typing_start`, `typing_stop`
- Server emits: `new_message`, `user_joined`, `user_left`, `presence_update`
- Save every message to PostgreSQL on `send_message`
- Create `GET /api/rooms/:id/messages?before=<cursor>` with cursor-based pagination
- Generate `backend/public/test-client.html` — single-file visual test page for two browser tabs

**What you (the user) will do externally:**
- Open `test-client.html` in two browser tabs
- Join the same room in both tabs and verify real-time chat, typing indicators, and presence

**Technology explained:**
- **Cursor Pagination:** Instead of `LIMIT 20 OFFSET 40` (which breaks when new messages arrive), we use `WHERE created_at < '2024-01-01T10:00:00'`. This guarantees no duplicate or skipped messages when scrolling back.
- **Socket rooms:** Virtual groupings on the server. `socket.join(roomId)` registers the socket in a room. `io.to(roomId).emit(...)` delivers events only to sockets in that room.

**Resources:**
- [Slack API Cursor Pagination Explanation](https://api.slack.com/docs/pagination)
- [Socket.io Rooms Docs](https://socket.io/docs/v4/rooms/)

**Prompt to give AI:**
> "Proceed with Day 3: Create the room messages API with cursor pagination, handle socket events (join/leave/send/typing), persist messages to PostgreSQL, and write a single-file test-client.html in the public directory."

---

## ⬜ Day 4 — UPCOMING
### Dockerise Everything

**What the AI will do:**
- Create a multi-stage `Dockerfile` (small Alpine image, non-root user)
- Write `docker-compose.yml` running app + postgres + redis with healthchecks and volumes
- One command starts the full stack: `docker compose up --build`

**What you (the user) will do externally:**
- Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Run: `docker compose up --build`
- Open two browser tabs → verify the containerized chat app works

**Technology explained:**
- **Multi-stage Dockerfile:** Stage 1 installs everything. Stage 2 copies only production files into a clean Alpine image. Result: ~150MB image instead of ~1.2GB.
- **docker-compose.yml:** One file defines all three services (app, postgres, redis), their environment variables, volumes, and startup order.
- **Healthchecks:** Docker waits until Postgres is truly ready before starting the app — prevents the "database not ready" crash on cold start.

**Resources:**
- [Docker Curriculum (free)](https://docker-curriculum.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

**Prompt to give AI:**
> "Proceed with Day 4: Generate a multi-stage Dockerfile and a docker-compose.yml file. Configure persistent volumes for Postgres and Redis, establish healthchecks, and document how to start the app in one command."

---

## ⬜ Day 5 — UPCOMING
### CI/CD with GitHub Actions & Production Deploy

**What the AI will do:**
- Create `.github/workflows/ci.yml` — runs tests on every push to `main` with Postgres + Redis service containers
- Triggers Render deploy hook automatically on green build
- Adds status badge to README
- Creates final portfolio-ready README

**What you (the user) will do externally:**
- Push repo to GitHub
- Create Web Service on [Render](https://render.com) linked to your repo
- Create Redis service on Render, copy the internal URL to `REDIS_URL` environment variable
- Copy Render deploy hook URL → add as `RENDER_DEPLOY_HOOK` secret in GitHub repo settings
- Record a 90-second demo video: two tabs chatting → git push → GitHub Actions running → auto-deploy finishing

**Technology explained:**
- **CI/CD:** Every code push triggers an automated pipeline: lint → test → build → deploy. A failing test blocks the deploy. This prevents bad code reaching production.
- **GitHub Actions service containers:** The workflow spins up real Postgres and Redis containers during tests so your code runs against actual databases, not mocks.
- **Render deploy hook:** A secret URL that triggers a new deployment when called via HTTP POST. GitHub Actions calls it only after all tests pass.

**Resources:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deploy Hooks Docs](https://render.com/docs/deploy-hooks)

**Prompt to give AI:**
> "Proceed with Day 5: Set up `.github/workflows/ci.yml` running Node, Postgres, and Redis service containers for tests, configure build steps, set up Render deploy trigger instructions, and update the README with badges."

---

## 🛠️ Technology Quick Reference

### WebSockets vs REST (for interviews)
- **Why polling doesn't scale:** Every poll = new TCP connection + TLS handshake + HTTP headers (1KB+) + DB auth query. For 1,000 users polling every 2s = 500 empty requests/second wasting CPU.
- **How WebSocket stays open:** Client sends `Upgrade: websocket` header. Server responds `HTTP 101 Switching Protocols`. TCP socket stays open. Messages sent as 2-10 byte binary frames — no headers, no reconnection.

---

## 🎤 Interview Q&A — All 5 Days

**Q1: Why Redis Pub/Sub adapter for Socket.io?**
> "In-memory socket maps break with multiple server instances. User A on Server 1 can't reach User B on Server 2. The Redis adapter makes all servers publish socket events to a shared Redis channel. Every server subscribes and delivers to its local connections — all instances act as one."

**Q2: Why cursor-based pagination for chat history?**
> "`LIMIT 20 OFFSET 40` breaks when new messages arrive mid-scroll — you get duplicates or gaps. Cursor pagination uses `WHERE created_at < <last_seen_timestamp>` — it always returns the exact next page regardless of insertions, making it reliable for live chat history."

**Q3: How does Socket.io authentication differ from REST JWT auth?**
> "REST validates the JWT on every HTTP request. Socket.io validates the JWT once during the handshake in `io.use()` middleware. The user object is attached to the socket connection permanently. All subsequent messages on that connection are pre-authenticated — no repeated DB lookups."

**Q4: Why multi-stage Dockerfile?**
> "A single-stage build copies devDependencies, build tools, and cache into the image — often 1GB+. Multi-stage: Stage 1 builds, Stage 2 copies only the production output into a clean Alpine base. Result: ~150MB image, smaller attack surface, faster pulls and deploys."

**Q5: What is TTL and why use it for presence?**
> "TTL is Redis's auto-expiry feature. We set `user:online:X` with `EX 35` seconds. If a user disconnects cleanly, we delete the key immediately. If their browser crashes and no disconnect event fires, the key expires automatically after 35 seconds — preventing ghost 'online' statuses."

**Q6: What does `Promise.all` do in your server startup?**
> "It runs MongoDB connection, PostgreSQL bootstrap, and Redis connection simultaneously in parallel. All three must succeed before the port opens. If any one fails, the server exits with a clear error. This prevents a partially-initialized server from silently accepting requests it can't fulfill."
