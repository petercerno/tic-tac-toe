/**
 * Shared constants for multiplayer functionality.
 */

/**
 * Maximum number of players allowed in a single room.
 */
export const MAX_PLAYERS_PER_ROOM = 2;

/**
 * Maximum length of a room name.
 */
export const MAX_ROOM_NAME_LENGTH = 20;

/**
 * Regular expression pattern for valid room names.
 * Allows letters, numbers, and hyphens only.
 */
export const ROOM_NAME_REGEX = /^[a-zA-Z0-9-]+$/;

/**
 * Inactivity timeout in milliseconds before disconnecting all clients in a room.
 * If no game state changes occur within this period, the room is released.
 */
export const ROOM_INACTIVITY_TIMEOUT_MS = 600_000;

// ==================== Security Configuration ====================

/**
 * Maximum number of concurrent rooms allowed on the server.
 * Prevents memory exhaustion from unlimited room creation.
 */
export const MAX_TOTAL_ROOMS = 10_000;

/**
 * Maximum size of game state payload in bytes.
 * Prevents bandwidth/memory abuse from oversized payloads.
 */
export const MAX_GAME_STATE_SIZE = 102_400; // 100 KB

/**
 * Maximum number of WebSocket connections allowed per IP address.
 * Prevents connection flooding from a single source.
 */
export const MAX_CONNECTIONS_PER_IP = 100;

/**
 * Rate limit configuration for Socket.IO events.
 * Each entry defines [points, duration in seconds].
 * Points = max requests allowed within the duration window.
 */
export const RATE_LIMITS = {
    /** JOIN_ROOM: 5 requests per 10 seconds */
    JOIN_ROOM: { points: 5, duration: 10 },
    /** GAME_STATE: 30 requests per 10 seconds (3 moves/sec max) */
    GAME_STATE: { points: 30, duration: 10 },
    /** REQUEST_STATE: 10 requests per 10 seconds */
    REQUEST_STATE: { points: 10, duration: 10 },
    /** SEND_STATE: 10 requests per 10 seconds */
    SEND_STATE: { points: 10, duration: 10 },
    /** Health endpoint: 30 requests per 10 seconds */
    HEALTH: { points: 30, duration: 10 },
} as const;
