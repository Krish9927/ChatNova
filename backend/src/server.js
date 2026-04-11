import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './lib/db.js';
import { ENV } from './lib/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { io, app, server } from './lib/socket.js';

app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(cookieParser());

// Default body limit is ~100kb; profile pics are sent as base64 and need more headroom
// Increase limit to allow larger base64 images from the client
const jsonLimit = "50mb";
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

const __dirname = path.resolve();
console.log(ENV.PORT);
const PORT = ENV.PORT || 3001;
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
if (ENV.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("*", (_, res) => {
        res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
    });
}


// Connect DB first, then start server — prevents "buffering timed out" on early requests
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to connect to MongoDB, server not started:', err);
    process.exit(1);
});

// Error handler for JSON parse errors and other errors — respond with JSON
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Malformed JSON' });
    }
    // Explicitly handle too-large payloads
    if (err && (err.status === 413 || err.type === 'entity.too.large')) {
        return res.status(413).json({ message: 'Request entity too large' });
    }
    if (err) {
        console.error('Unhandled error:', err);
        return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
    next();
});
