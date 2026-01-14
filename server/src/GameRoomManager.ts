/**
 * GameRoomManager - Handles all Socket.IO room and game state logic.
 *
 * Manages player connections, room join/leave, and game state synchronization
 * for the multiplayer Tic-Tac-Toe game.
 */
import type { Server, Socket } from 'socket.io';
import {
    SocketEvents,
    type JoinRoomResponse,
    type LeaveRoomResponse,
    type PlayerJoinedPayload,
    type SendStatePayload,
    type StateRequestedPayload,
} from '../../shared/types.js';
import {
    ROOM_NAME_REGEX,
    MAX_ROOM_NAME_LENGTH,
    MAX_PLAYERS_PER_ROOM,
    ROOM_INACTIVITY_TIMEOUT_MS,
    MAX_TOTAL_ROOMS,
} from '../../shared/constants.js';
import {
    checkJoinRoomLimit,
    checkGameStateLimit,
    checkSendStateLimit,
    checkRequestStateLimit,
    validateGameStateSize,
} from './RateLimiter.js';

/**
 * Manages Socket.IO connections and room-based multiplayer functionality.
 */
export class GameRoomManager {
    private io: Server;
    /** Maps room names to their inactivity timeout handles. */
    private roomTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

    constructor(io: Server) {
        this.io = io;
    }

    // ==================== Public Methods ====================

    /**
     * Initializes the Socket.IO connection handler.
     * Call this after creating the GameRoomManager instance.
     *
     * Flow:
     * 1. Registers 'connection' event listener on Socket.IO server
     * 2. Each new socket connection triggers handleConnection
     */
    public initialize(): void {
        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    // ==================== Connection Handling ====================

    /**
     * Handles a new socket connection, setting up all event listeners.
     *
     * Flow:
     * 1. Socket connects to server
     * 2. Creates closure over currentRoom to track room membership
     * 3. Registers handlers for JOIN_ROOM, LEAVE_ROOM, GAME_STATE,
     *    REQUEST_STATE, SEND_STATE, and disconnect events
     *
     * @param socket - The newly connected socket
     */
    private handleConnection(socket: Socket): void {
        console.log(`Client connected: ${socket.id}`);

        // Track current room for this socket
        let currentRoom: string | null = null;

        // Set up event handlers with closure over currentRoom
        socket.on(SocketEvents.JOIN_ROOM, async (
            roomName: string,
            callback: (response: JoinRoomResponse) => void
        ) => {
            currentRoom = await this.handleJoinRoom(socket, roomName, currentRoom, callback);
        });

        socket.on(SocketEvents.LEAVE_ROOM, (callback?: (response: LeaveRoomResponse) => void) => {
            currentRoom = this.handleLeaveRoom(socket, currentRoom, callback);
        });

        socket.on(SocketEvents.GAME_STATE, (state: unknown) => {
            this.handleGameState(socket, currentRoom, state);
        });

        socket.on(SocketEvents.REQUEST_STATE, () => {
            this.handleRequestState(socket, currentRoom);
        });

        socket.on(SocketEvents.SEND_STATE, (data: SendStatePayload) => {
            this.handleSendState(socket, currentRoom, data);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket, currentRoom);
        });
    }

    // ==================== Event Handlers ====================
    // Methods are ordered to match the event registration order in handleConnection:
    // JOIN_ROOM → LEAVE_ROOM → GAME_STATE → REQUEST_STATE → SEND_STATE → disconnect

    /**
     * Handles JOIN_ROOM event from client.
     *
     * Flow:
     * 1. Client emits JOIN_ROOM with roomName
     * 2. Server validates room name and checks capacity
     * 3. Server joins socket to room, emits PLAYER_JOINED to existing members
     * 4. Server responds via callback with JoinRoomResponse
     *
     * @param socket - The connecting socket
     * @param roomName - Requested room name to join
     * @param currentRoom - Player's current room (if any, will be left)
     * @param callback - Acknowledgment callback to send JoinRoomResponse
     * @returns The new room name if successful, previous room if failed
     */
    private async handleJoinRoom(
        socket: Socket,
        roomName: string,
        currentRoom: string | null,
        callback: (response: JoinRoomResponse) => void
    ): Promise<string | null> {
        try {
            // Rate limit check
            if (!await checkJoinRoomLimit(socket.id)) {
                callback({ success: false, error: 'Too many requests. Please slow down.' });
                return currentRoom;
            }

            // Validate room name
            if (!roomName || !ROOM_NAME_REGEX.test(roomName) || roomName.length > MAX_ROOM_NAME_LENGTH) {
                callback({ success: false, error: 'Invalid room name.' });
                return currentRoom;
            }

            // Check total room limit (only for new rooms)
            const playerCount = this.getRoomPlayerCount(roomName);
            if (playerCount === 0 && this.getTotalRoomCount() >= MAX_TOTAL_ROOMS) {
                callback({ success: false, error: 'Server is at capacity. Please try again later.' });
                return currentRoom;
            }

            // Check room capacity
            if (playerCount >= MAX_PLAYERS_PER_ROOM) {
                callback({ success: false, error: `Maximum ${MAX_PLAYERS_PER_ROOM} players allowed.` });
                return currentRoom;
            }

            // Leave current room if in one
            if (currentRoom) {
                this.leaveCurrentRoom(socket, currentRoom);
            }

            // Join the new room
            socket.join(roomName);

            const isRoomOwner = playerCount === 0;
            const newPlayerCount = playerCount + 1;

            console.log(`${socket.id} joined room "${roomName}" (${newPlayerCount} players)`);

            // Notify other player that someone joined
            const payload: PlayerJoinedPayload = { playerCount: newPlayerCount };
            socket.to(roomName).emit(SocketEvents.PLAYER_JOINED, payload);

            // Start inactivity timeout for this room
            this.resetRoomTimeout(roomName);

            callback({ success: true, isRoomOwner, playerCount: newPlayerCount });
            return roomName;
        } catch (error) {
            console.error('Error joining room:', error);
            callback({ success: false, error: 'Failed to join room.' });
            return currentRoom;
        }
    }

    /**
     * Handles LEAVE_ROOM event from client.
     *
     * Flow:
     * 1. Client emits LEAVE_ROOM
     * 2. Server emits PLAYER_LEFT to remaining room members
     * 3. Server removes socket from room
     * 4. Server responds via optional callback with LeaveRoomResponse
     *
     * @param socket - The leaving socket
     * @param currentRoom - Room to leave (null if not in a room)
     * @param callback - Optional acknowledgment callback
     * @returns null to clear the socket's current room tracking
     */
    private handleLeaveRoom(
        socket: Socket,
        currentRoom: string | null,
        callback?: (response: LeaveRoomResponse) => void
    ): null {
        if (currentRoom) {
            console.log(`${socket.id} left room "${currentRoom}"`);
            this.leaveCurrentRoom(socket, currentRoom);
        }
        callback?.({ success: true });
        return null;
    }

    /**
     * Handles GAME_STATE event from client.
     *
     * Flow:
     * 1. Client emits GAME_STATE after making a move
     * 2. Server relays GAME_STATE to all other players in the room
     *
     * @param socket - The socket sending the state
     * @param currentRoom - Room to broadcast to
     * @param state - The complete game state to synchronize
     */
    private async handleGameState(socket: Socket, currentRoom: string | null, state: unknown): Promise<void> {
        if (!currentRoom) return;

        // Rate limit check
        if (!await checkGameStateLimit(socket.id)) {
            console.log(`Rate limited GAME_STATE from ${socket.id}`);
            return;
        }

        // Payload size validation
        if (!validateGameStateSize(state)) {
            console.log(`Rejected oversized GAME_STATE from ${socket.id}`);
            return;
        }

        // Reset inactivity timeout on any state change
        this.resetRoomTimeout(currentRoom);

        socket.to(currentRoom).emit(SocketEvents.GAME_STATE, state);
    }

    /**
     * Handles REQUEST_STATE event from client.
     *
     * Flow:
     * 1. New player (non-owner) emits REQUEST_STATE after joining
     * 2. Server emits STATE_REQUESTED to room owner with requester's socket ID
     * 3. Room owner should respond with SEND_STATE containing current game state
     *
     * @param socket - The socket requesting state (new player)
     * @param currentRoom - Room to request state from
     */
    private async handleRequestState(socket: Socket, currentRoom: string | null): Promise<void> {
        if (!currentRoom) return;

        // Rate limit check
        if (!await checkRequestStateLimit(socket.id)) {
            console.log(`Rate limited REQUEST_STATE from ${socket.id}`);
            return;
        }

        // Reset inactivity timeout on state request
        this.resetRoomTimeout(currentRoom);

        const payload: StateRequestedPayload = { requesterId: socket.id };
        socket.to(currentRoom).emit(SocketEvents.STATE_REQUESTED, payload);
    }

    /**
     * Handles SEND_STATE event from client (room owner).
     *
     * Flow:
     * 1. Room owner emits SEND_STATE in response to STATE_REQUESTED
     * 2. Server verifies sender is in same room as target
     * 3. Server validates payload size
     * 4. Server sends GAME_STATE directly to the specified target player
     *
     * @param socket - The socket sending the state (must be room owner)
     * @param currentRoom - Room the sender is in
     * @param data - Contains targetId (recipient socket ID) and game state
     */
    private async handleSendState(
        socket: Socket,
        currentRoom: string | null,
        data: SendStatePayload
    ): Promise<void> {
        if (!currentRoom) return;

        // Rate limit check
        if (!await checkSendStateLimit(socket.id)) {
            console.log(`Rate limited SEND_STATE from ${socket.id}`);
            return;
        }

        // Verify target is in the same room as sender
        const room = this.io.sockets.adapter.rooms.get(currentRoom);
        if (!room || !room.has(data.targetId)) {
            console.log(`Rejected SEND_STATE: target ${data.targetId} not in room ${currentRoom}`);
            return;
        }

        // Payload size validation
        if (!validateGameStateSize(data.state)) {
            console.log(`Rejected oversized SEND_STATE from ${socket.id}`);
            return;
        }

        // Reset inactivity timeout on state send
        this.resetRoomTimeout(currentRoom);

        this.io.to(data.targetId).emit(SocketEvents.GAME_STATE, data.state);
    }

    /**
     * Handles socket disconnect event.
     *
     * Flow:
     * 1. Client disconnects (closes browser, network issue, etc.)
     * 2. Server removes socket from room and notifies remaining members
     * 3. Clears room timeout if room becomes empty
     *
     * @param socket - The disconnecting socket
     * @param currentRoom - Room the player was in (null if not in a room)
     */
    private handleDisconnect(socket: Socket, currentRoom: string | null): void {
        console.log(`Client disconnected: ${socket.id}`);
        if (currentRoom) {
            this.leaveCurrentRoom(socket, currentRoom);
        }
    }

    // ==================== Room Utilities ====================

    /**
     * Removes a socket from its current room and notifies remaining members.
     *
     * Flow:
     * 1. Emits PLAYER_LEFT to remaining room members
     * 2. Removes socket from room
     * 3. Clears room timeout if room becomes empty
     *
     * @param socket - The socket to remove from the room
     * @param roomName - The room to leave
     */
    private leaveCurrentRoom(socket: Socket, roomName: string): void {
        socket.to(roomName).emit(SocketEvents.PLAYER_LEFT);
        socket.leave(roomName);

        // Clear timeout if room is now empty
        const remainingPlayers = this.getRoomPlayerCount(roomName);
        if (remainingPlayers === 0) {
            this.clearRoomTimeout(roomName);
        }
    }

    /**
     * Returns the number of players currently in a room.
     *
     * Flow:
     * 1. Looks up room in Socket.IO adapter
     * 2. Returns room size or 0 if room doesn't exist
     *
     * @param roomName - The name of the room to check
     * @returns The number of sockets in the room (0 if room doesn't exist)
     */
    private getRoomPlayerCount(roomName: string): number {
        const room = this.io.sockets.adapter.rooms.get(roomName);
        return room ? room.size : 0;
    }

    /**
     * Returns the total number of active game rooms.
     * Uses roomTimeouts.size for O(1) lookup since all active rooms have timeouts.
     *
     * @returns The number of active game rooms
     */
    private getTotalRoomCount(): number {
        return this.roomTimeouts.size;
    }

    // ==================== Room Timeout Management ====================

    /**
     * Resets the inactivity timeout for a room.
     *
     * Flow:
     * 1. Clears any existing timeout for the room
     * 2. Sets new timeout that calls disconnectRoom after ROOM_INACTIVITY_TIMEOUT_MS
     * 3. Stores timeout handle in roomTimeouts map
     *
     * @param roomName - The room to reset the timeout for
     */
    private resetRoomTimeout(roomName: string): void {
        // Clear any existing timeout for this room
        const existingTimeout = this.roomTimeouts.get(roomName);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            this.disconnectRoom(roomName);
        }, ROOM_INACTIVITY_TIMEOUT_MS);

        this.roomTimeouts.set(roomName, timeout);
    }

    /**
     * Clears the inactivity timeout for a room.
     *
     * Flow:
     * 1. Retrieves timeout handle from roomTimeouts map
     * 2. Clears the timeout if it exists
     * 3. Removes entry from roomTimeouts map
     *
     * @param roomName - The room to clear the timeout for
     */
    private clearRoomTimeout(roomName: string): void {
        const timeout = this.roomTimeouts.get(roomName);
        if (timeout) {
            clearTimeout(timeout);
            this.roomTimeouts.delete(roomName);
        }
    }

    /**
     * Disconnects all clients in a room due to inactivity.
     *
     * Flow:
     * 1. Looks up room in Socket.IO adapter
     * 2. Emits ROOM_TIMEOUT to all clients in the room
     * 3. Disconnects each socket in the room
     * 4. Removes timeout entry from roomTimeouts map
     *
     * @param roomName - The room to disconnect
     */
    private disconnectRoom(roomName: string): void {
        const room = this.io.sockets.adapter.rooms.get(roomName);
        if (!room) {
            this.roomTimeouts.delete(roomName);
            return;
        }

        console.log(`Room "${roomName}" timed out due to inactivity, disconnecting ${room.size} clients`);

        // Emit timeout event to all clients in the room
        this.io.to(roomName).emit(SocketEvents.ROOM_TIMEOUT);

        // Disconnect all sockets in the room
        for (const socketId of room) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect(true);
            }
        }

        this.roomTimeouts.delete(roomName);
    }
}
