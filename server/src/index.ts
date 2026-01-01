/**
 * Express + Socket.IO server for Tic-Tac-Toe application.
 *
 * Serves the static Phaser game from client/dist and provides real-time
 * multiplayer functionality through WebSocket rooms.
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoomManager } from './GameRoomManager.js';

// ES Module compatibility: __dirname is not available in ESM, so we derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS for development
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Path to the Vite production build output
const distPath = path.join(__dirname, '../../client/dist');

// Serve static assets (JS, CSS, images) from the client build
app.use(express.static(distPath));

/**
 * Health check endpoint for monitoring and debugging.
 * Returns server status and current timestamp.
 */
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * SPA fallback: serves index.html for all unmatched routes.
 * This enables client-side routing in the Phaser application.
 * Note: Express 5 requires named wildcard parameters (/{*path}) instead of (*)
 */
app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Initialize multiplayer room management
const roomManager = new GameRoomManager(io);
roomManager.initialize();

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export { app, io };
