/**
 * ServerHealth - Provides health check functionality with server statistics.
 *
 * Renders a styled HTML dashboard showing active rooms, player counts,
 * and server status for monitoring and debugging purposes.
 */
import type { Express } from 'express';
import type { Server } from 'socket.io';

/**
 * Manages the server health endpoint and statistics display.
 */
export class ServerHealth {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Registers the /health endpoint on the Express app.
     *
     * @param app - The Express application instance
     */
    register(app: Express): void {
        app.get('/health', (_req, res) => {
            const { activeRooms, activePlayers } = this.getStats();
            const html = this.renderHealthPage(activeRooms, activePlayers);
            res.type('html').send(html);
        });
    }

    /**
     * Calculates current server statistics.
     *
     * @returns Object containing activeRooms and activePlayers counts
     */
    private getStats(): { activeRooms: number; activePlayers: number } {
        const rooms = this.io.sockets.adapter.rooms;
        const sids = this.io.sockets.adapter.sids;

        let activeRooms = 0;
        let activePlayers = 0;

        rooms.forEach((sockets, roomName) => {
            // A room is a game room if its name is NOT a socket ID
            if (!sids.has(roomName)) {
                activeRooms++;
                activePlayers += sockets.size;
            }
        });

        return { activeRooms, activePlayers };
    }

    /**
     * Renders the health dashboard HTML page.
     *
     * @param activeRooms - Number of active game rooms
     * @param activePlayers - Total number of connected players
     * @returns Complete HTML string for the health page
     */
    private renderHealthPage(activeRooms: number, activePlayers: number): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Health</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e0e0e0;
        }
        .container {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px 50px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
        }
        h1 {
            font-size: 1.8rem;
            margin-bottom: 30px;
            color: #4ade80;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.08);
            padding: 25px 30px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #60a5fa;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9rem;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .timestamp {
            font-size: 0.85rem;
            color: #6b7280;
        }
        @media (max-width: 480px) {
            .container {
                padding: 25px 20px;
                margin: 15px;
                border-radius: 16px;
            }
            h1 {
                font-size: 1.4rem;
                margin-bottom: 20px;
            }
            .stats {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            .stat-card {
                padding: 20px;
            }
            .stat-value {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Server Online</h1>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${activeRooms}</div>
                <div class="stat-label">Active Rooms</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${activePlayers}</div>
                <div class="stat-label">Active Players</div>
            </div>
        </div>
        <div class="timestamp">Last updated:<br>${new Date().toISOString()}</div>
    </div>
</body>
</html>`;
    }
}
