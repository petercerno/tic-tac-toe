/**
 * Express + Socket.IO server for Tic-Tac-Toe application.
 *
 * Serves the static Phaser game from client/dist and provides real-time
 * multiplayer functionality through WebSocket rooms.
 *
 * Room Management:
 * - Rooms are created on-demand when the first player joins
 * - Maximum 2 players per room
 * - State is not persisted on server; clients sync state between themselves
 */
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

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

// ==================== Socket.IO Event Handlers ====================

/**
 * Returns the number of players currently in a room.
 */
async function getRoomPlayerCount(roomName: string): Promise<number> {
    const room = io.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
}

/**
 * Handles all Socket.IO connection events.
 */
io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Track current room for this socket
    let currentRoom: string | null = null;

    /**
     * Handle room join request.
     * Creates room if it doesn't exist, or joins if < 2 players.
     */
    socket.on('join-room', async (roomName: string, callback: (response: { success: boolean; error?: string; isRoomOwner?: boolean; playerCount?: number }) => void) => {
        try {
            // Validate room name
            if (!roomName || !/^[a-zA-Z0-9-]+$/.test(roomName)) {
                callback({ success: false, error: 'Invalid room name.' });
                return;
            }

            // Check room capacity
            const playerCount = await getRoomPlayerCount(roomName);
            if (playerCount >= 2) {
                callback({ success: false, error: 'Maximum 2 players allowed.' });
                return;
            }

            // Leave current room if in one
            if (currentRoom) {
                socket.leave(currentRoom);
                socket.to(currentRoom).emit('player-left');
            }

            // Join the new room
            socket.join(roomName);
            currentRoom = roomName;

            const isRoomOwner = playerCount === 0;
            const newPlayerCount = playerCount + 1;

            console.log(`${socket.id} joined room "${roomName}" (${newPlayerCount} players)`);

            // Notify other player that someone joined
            socket.to(roomName).emit('player-joined', { playerCount: newPlayerCount });

            callback({ success: true, isRoomOwner, playerCount: newPlayerCount });
        } catch (error) {
            console.error('Error joining room:', error);
            callback({ success: false, error: 'Failed to join room.' });
        }
    });

    /**
     * Handle room leave request.
     */
    socket.on('leave-room', (callback?: (response: { success: boolean }) => void) => {
        if (currentRoom) {
            console.log(`${socket.id} left room "${currentRoom}"`);
            socket.to(currentRoom).emit('player-left');
            socket.leave(currentRoom);
            currentRoom = null;
        }
        callback?.({ success: true });
    });

    /**
     * Handle game state broadcast.
     * Forwards the entire game state to the other player in the room.
     */
    socket.on('game-state', (state: unknown) => {
        if (currentRoom) {
            socket.to(currentRoom).emit('game-state', state);
        }
    });

    /**
     * Handle state request from new player.
     * Asks the room owner to send their current state.
     */
    socket.on('request-state', () => {
        if (currentRoom) {
            socket.to(currentRoom).emit('state-requested', { requesterId: socket.id });
        }
    });

    /**
     * Handle sending state to a specific player.
     */
    socket.on('send-state', (data: { targetId: string; state: unknown }) => {
        io.to(data.targetId).emit('game-state', data.state);
    });

    /**
     * Handle disconnect.
     */
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (currentRoom) {
            socket.to(currentRoom).emit('player-left');
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export { app, io };
