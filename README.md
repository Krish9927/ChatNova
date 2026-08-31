# 💬 ChatNova — Scalable Real-Time Chat Platform

[![CI/CD Pipeline](https://github.com/Krish9927/ChatNova/actions/workflows/ci.yml/badge.svg)](https://github.com/Krish9927/ChatNova/actions/workflows/ci.yml)
![Node Version](https://img.shields.io/badge/Node.js-v20.x-brightgreen?logo=nodedotjs)
![Docker Supported](https://img.shields.io/badge/Docker-Supported-blue?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> **ChatNova** is an enterprise-grade, real-time messaging platform engineered for horizontal scalability, high-throughput persistence, and instant presence tracking. Built using a **Polyglot Persistence** architecture, ChatNova leverages MongoDB, PostgreSQL, and Redis to solve real-world real-time chat challenges.

---

## ✨ Key Features

- ⚡ **Real-Time Messaging & Room Management**: Instant pub/sub socket communication with room join/leave broadcasts.
- 🗄️ **Polyglot Persistence Architecture**:
  - **MongoDB**: User authentication, profiles, group metadata, and friendships.
  - **PostgreSQL**: High-speed chat message logs backed by compound indexes (`idx_messages_room_created_at`).
  - **Redis**: Low-latency online presence tracking with TTL auto-expiration and Socket.io multi-server pub/sub scaling.
- 📜 **Cursor-Based Message Pagination**: Prevents duplicate/missing message bugs common in traditional offset pagination during active chat streams.
- 🟢 **Heartbeat-Backed Presence System**: Online state stored in Redis with 35-second TTL auto-expire and 25-second active socket heartbeats.
- ⌨️ **Real-Time Typing Indicators**: Seamless `typing_start` and `typing_stop` event synchronization scoped to active rooms.
- 🌐 **Multi-Language AI Translation**: On-the-fly message translation for cross-language chat channels.
- 🐳 **Containerized Deployment**: Production-ready multi-stage Dockerfile (~150MB Alpine runner, non-root user) and Docker Compose stack with DB healthchecks.
- 🔄 **Automated CI/CD**: GitHub Actions workflow featuring Postgres & Redis service containers, automated build verification, and deployment webhooks.
- 🧪 **Built-in Visual Test Client**: Lightweight HTML client accessible at `/test-client` for rapid API and socket debugging.

---

## 🏗️ Architecture & Data Flow

```text
                           ┌───────────────────────────┐
                           │   React 18 Frontend       │
                           │(Vite + Zustand + Tailwind)│
                           └─────────────┬─────────────┘
                                         │ (HTTP / WebSockets)
                                         ▼
                           ┌───────────────────────────┐
                           │    Node.js / Express      │
                           │   Socket.io Server        │
                           └─────┬───────┬───────┬─────┘
                                 │       │       │
             ┌───────────────────┘       │       └───────────────────┐
             ▼                           ▼                           ▼
  ┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
  │      MongoDB       │      │     PostgreSQL     │      │       Redis        │
  │ (Mongoose Atlas)   │      │   (Neon / Local)   │      │  (In-Memory Store) │
  ├────────────────────┤      ├────────────────────┤      ├────────────────────┤
  │ • User Auth        │      │ • Chat Messages    │      │ • Presence TTL     │
  │ • User Profiles    │      │ • Room History     │      │ • Socket Pub/Sub   │
  │ • Friends & Groups │      │ • Cursor Indexing  │      │ • Horizontal Scale │
  └────────────────────┘      └────────────────────┘      └────────────────────┘
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Zustand, TailwindCSS, Socket.io-client | Fast reactive UI, central state, real-time client |
| **Backend** | Node.js (ESM), Express.js, Socket.io | REST API endpoints, real-time socket connections |
| **Database (Auth)** | MongoDB, Mongoose | Flexible document model for user accounts and metadata |
| **Database (Messages)**| PostgreSQL, `pg` Pool | Relational schema for indexed, append-heavy chat history |
| **Cache & Broker** | Redis, `@socket.io/redis-adapter` | Presence key-value with TTL expiration, multi-server adapter |
| **DevOps & Infra** | Docker, Docker Compose, GitHub Actions | Multi-stage container builds, automated CI/CD pipeline |
| **Cloud Services** | Neon PostgreSQL, Resend, Cloudinary | Serverless Postgres database, email delivery, media storage |

---

## 📋 Prerequisites

Before running ChatNova, ensure you have the following installed locally:

- [Node.js v20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for running containerized stack)
- [Git](https://git-scm.com/)

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended — Full Stack with DBs)

Run the entire application (Node backend + PostgreSQL + Redis) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/Krish9927/ChatNova.git
cd ChatNova

# 2. Configure Environment Variables
cp .env.example backend/.env
# Update backend/.env with your MONGO_URI and JWT_SECRET

# 3. Build and launch all containers
docker compose up --build
```

The application will be accessible at:
- **Backend API & Test Client**: `http://localhost:3000`
- **Visual Test Client**: `http://localhost:3000/test-client`

To stop the containers safely:
```bash
docker compose down
```

---

### Option 2: Local Development Setup

If you prefer running services individually for rapid local development:

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file from template
cp ../.env.example .env

# Run local Redis container (if Redis isn't installed natively)
docker run -d --name chatnova-redis -p 6379:6379 redis:alpine

# Start development server
npm run dev
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Navigate to `http://localhost:5173` to access the React interface.

---

## 📁 Project Structure

```text
ChatNova/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD workflow
├── backend/
│   ├── public/
│   │   └── test-client.html          # Standalone socket test client
│   ├── src/
│   │   ├── controllers/              # Auth, Room, Friend, Group, Translate controllers
│   │   ├── lib/                      # DB connections (pg.js, redis.js, db.js, socket.js)
│   │   ├── middleware/               # Auth middleware (HTTP JWT & Socket JWT)
│   │   ├── routes/                   # Express routes (/api/auth, /api/rooms, etc.)
│   │   └── server.js                 # Express server & DB startup orchestration
│   ├── .dockerignore                 # Excludes node_modules & secrets from build
│   ├── Dockerfile                    # Multi-stage Alpine container configuration
│   └── package.json
├── frontend/
│   ├── src/                          # React components, Zustand stores, custom hooks
│   └── package.json
├── docker-compose.yml                # Multi-service container orchestration
└── README.md                         # Project documentation
```

---

## 🔑 Environment Variables

Create a `backend/.env` file based on `.env.example`:

```env
PORT=3000
NODE_ENV=development

# MongoDB Atlas URI
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/chatnova_db

# Security
JWT_SECRET=your_super_secret_jwt_key

# Frontend URL for CORS
CLIENT_URL=http://localhost:5173

# PostgreSQL (Neon Cloud or Local Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatnova_db

# Redis
REDIS_URL=redis://localhost:6379

# Integrations
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=your_resend_api_key
```

---

## 🧪 Testing & Verification

- **Visual Test Client**: Visit `http://localhost:3000/test-client` while the backend is running to test authentication, socket handshakes, room joining, typing indicators, and Postgres message saving in real-time.
- **CI/CD Integration**: Every pull request triggers GitHub Actions with live Postgres and Redis service containers to verify builds before merging.

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ for scalable real-time systems architecture.
</p>
