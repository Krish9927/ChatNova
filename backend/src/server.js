import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import groupRoutes from './routes/group.route.js';
import friendRoutes from './routes/friend.route.js';
import roomRoutes from './routes/room.route.js';
import translateRoutes from './routes/translate.route.js';
import dashboardRoutes from './routes/dashboard.route.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './lib/db.js';
import { initPostgresDB } from './lib/db-init.js';
import { connectRedis } from './lib/redis.js';
import { ENV } from './lib/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { io, app, server, attachRedisAdapter } from './lib/socket.js';

app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(cookieParser());

const jsonLimit = "50mb";
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

const __dirname = path.resolve();
const PORT = ENV.PORT || 3001;

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/test-client", (req, res) => {
    res.sendFile(path.join(path.resolve(), "public/test-client.html"));
});

if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("*", (_, res) => {
        res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
    });
}

Promise.all([connectDB(), initPostgresDB(), connectRedis()])
    .then(() => {
        // Attach Redis adapter AFTER Redis clients are connected
        attachRedisAdapter();
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize databases, server not started:', err);
        process.exit(1);
    });

app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Malformed JSON' });
    }
    if (err && (err.status === 413 || err.type === 'entity.too.large')) {
        return res.status(413).json({ message: 'Request entity too large' });
    }
    if (err) {
        console.error('Unhandled error:', err);
        return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
    next();
});
