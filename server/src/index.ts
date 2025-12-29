/**
 * Express server for Tic-Tac-Toe application.
 *
 * Serves the static Phaser game from client/dist and provides API endpoints.
 * In production, this is the main entry point that serves the built frontend.
 *
 * Future enhancements:
 * - Socket.IO integration for real-time multiplayer
 * - Game state persistence
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility: __dirname is not available in ESM, so we derive it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

export { app };
