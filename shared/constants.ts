/**
 * Shared constants for multiplayer functionality.
 */

/**
 * Maximum number of players allowed in a single room.
 */
export const MAX_PLAYERS_PER_ROOM = 2;

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
