/**
 * Shared types for Socket.IO communication between client and server.
 */

/**
 * Socket event names as constants for type-safe event handling.
 *
 * Event directions:
 * - Client → Server: Events emitted by client, handled by server
 * - Server → Client: Events emitted by server, handled by client
 */
export const SocketEvents = {
    /** Client → Server: Emitted when a player requests to join a room. */
    JOIN_ROOM: 'join-room',
    /** Client → Server: Emitted when a player leaves their current room. */
    LEAVE_ROOM: 'leave-room',
    /** Bidirectional: Client broadcasts game state after a move; server relays to other players. */
    GAME_STATE: 'game-state',
    /** Client → Server: Emitted by a new player to request current game state from room owner. */
    REQUEST_STATE: 'request-state',
    /** Client → Server: Emitted by room owner to send state to a specific player (by targetId). */
    SEND_STATE: 'send-state',
    /** Server → Client: Emitted to existing players when a new player joins the room. */
    PLAYER_JOINED: 'player-joined',
    /** Server → Client: Emitted to remaining players when someone leaves or disconnects. */
    PLAYER_LEFT: 'player-left',
    /** Server → Client: Emitted to room owner when a new player requests game state. */
    STATE_REQUESTED: 'state-requested',
} as const;

/**
 * Server → Client callback response for JOIN_ROOM event.
 * Sent by the server to the joining client via acknowledgment callback.
 */
export interface JoinRoomResponse {
    /** Whether the join operation succeeded. */
    success: boolean;
    /** Error message if join failed (e.g., room full, invalid name). */
    error?: string;
    /** True if this client created the room (first player). */
    isRoomOwner?: boolean;
    /** Current number of players in the room after joining. */
    playerCount?: number;
}

/**
 * Server → Client payload for PLAYER_JOINED event.
 * Sent to existing room members when a new player joins.
 */
export interface PlayerJoinedPayload {
    /** Updated player count after the new player joined. */
    playerCount: number;
}

/**
 * Client → Server payload for SEND_STATE event.
 * Sent by the room owner to relay game state to a specific player.
 */
export interface SendStatePayload<T = unknown> {
    /** Socket ID of the player who should receive the state. */
    targetId: string;
    /** The game state to send. */
    state: T;
}

/**
 * Server → Client payload for STATE_REQUESTED event.
 * Sent to the room owner when a new player needs the current game state.
 */
export interface StateRequestedPayload {
    /** Socket ID of the player requesting the state. */
    requesterId: string;
}

/**
 * Server → Client callback response for LEAVE_ROOM event.
 * Sent by the server to confirm the leave operation.
 */
export interface LeaveRoomResponse {
    /** Whether the leave operation succeeded. */
    success: boolean;
}
