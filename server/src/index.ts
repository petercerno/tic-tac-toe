/**
 * Express + Socket.IO server for Tic-Tac-Toe application.
 *
 * Serves the static Phaser game from client/dist and provides real-time
 * multiplayer functionality through WebSocket rooms.
 *
 * Security features:
 * - Connection limits per IP address
 * - Rate limiting on Socket.IO events
 * - Payload size validation
 * - Room count limits
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoomManager } from './GameRoomManager.js';
import { ServerHealth } from './ServerHealth.js';
import { trackConnection, releaseConnection } from './RateLimiter.js';
import { BASE_PATH, SOCKET_IO_PATH } from '../../shared/constants.js';

// ES Module compatibility: __dirname is not available in ESM, so we derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS and timeout configuration.
// In production, client is served from the same origin, so we allow all same-origin requests.
// In development, we explicitly allow the Vite dev server and local server origins.
// Timeout settings are lenient to handle backgrounded tabs and mobile devices.
const io = new Server(httpServer, {
    path: SOCKET_IO_PATH,
    pingInterval: 25000, // How often to ping clients (25 seconds)
    pingTimeout: 60000,  // How long to wait for pong before disconnecting (60 seconds)
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? true
            : ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Path to the Vite production build output
// __dirname is server/dist/server/src/, so we go up 4 levels to project root
const distPath = path.join(__dirname, '../../../../client/dist');

// Serve static assets (JS, CSS, images) from the client build at BASE_PATH
app.use(BASE_PATH, express.static(distPath));

// Register health check endpoint (must be before SPA fallback)
const serverHealth = new ServerHealth(io);
serverHealth.register(app);

/**
 * Explicit route for BASE_PATH root.
 * Express static middleware doesn't serve index.html for the mount path itself.
 */
app.get(BASE_PATH, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

/**
 * SPA fallback: serves index.html for all unmatched BASE_PATH routes.
 * This enables client-side routing in the Phaser application.
 * The static middleware above handles actual files (JS, CSS, images).
 * Note: Express 5 requires named wildcard parameters (/{*path}) instead of (*)
 */
app.get(`${BASE_PATH}/{*path}`, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// ==================== Socket.IO Connection Handling ====================

/**
 * Middleware to enforce per-IP connection limits.
 * Rejects new connections if the IP has reached MAX_CONNECTIONS_PER_IP.
 */
io.use((socket, next) => {
    const ip = socket.handshake.address || 'unknown';

    if (!trackConnection(ip)) {
        console.log(`Connection rejected for ${ip}: connection limit exceeded`);
        return next(new Error('Connection limit exceeded'));
    }

    // Store IP on socket for cleanup on disconnect
    socket.data.ip = ip;
    next();
});

/**
 * Handle disconnection to release connection tracking.
 */
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        if (socket.data.ip) {
            releaseConnection(socket.data.ip);
        }
    });
});

// Initialize multiplayer room management
const roomManager = new GameRoomManager(io);
roomManager.initialize();

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export { app, io };
