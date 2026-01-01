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
import { ROOM_NAME_REGEX, MAX_PLAYERS_PER_ROOM } from '../../shared/constants.js';

/**
 * Manages Socket.IO connections and room-based multiplayer functionality.
 */
export class GameRoomManager {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    /**
     * Initializes the Socket.IO connection handler.
     * Call this after creating the GameRoomManager instance.
     *
     * Sets up the 'connection' event listener that handles all incoming sockets.
     * @returns void
     */
    public initialize(): void {
        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * Returns the number of players currently in a room.
     *
     * @param roomName - The name of the room to check
     * @returns The number of sockets in the room (0 if room doesn't exist)
     */
    private getRoomPlayerCount(roomName: string): number {
        const room = this.io.sockets.adapter.rooms.get(roomName);
        return room ? room.size : 0;
    }

    /**
     * Removes a socket from its current room and notifies remaining members.
     *
     * @param socket - The socket to remove from the room
     * @param roomName - The room to leave
     */
    private leaveCurrentRoom(socket: Socket, roomName: string): void {
        socket.to(roomName).emit(SocketEvents.PLAYER_LEFT);
        socket.leave(roomName);
    }

    /**
     * Handles a new socket connection, setting up all event listeners.
     *
     * Creates a closure over `currentRoom` to track the socket's room membership
     * and registers handlers for all game events.
     *
     * @param socket - The newly connected socket
     * @returns void
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
            this.handleSendState(data);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket, currentRoom);
        });
    }

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
            // Validate room name
            if (!roomName || !ROOM_NAME_REGEX.test(roomName)) {
                callback({ success: false, error: 'Invalid room name.' });
                return currentRoom;
            }

            // Check room capacity
            const playerCount = this.getRoomPlayerCount(roomName);
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
    private handleGameState(socket: Socket, currentRoom: string | null, state: unknown): void {
        if (currentRoom) {
            socket.to(currentRoom).emit(SocketEvents.GAME_STATE, state);
        }
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
    private handleRequestState(socket: Socket, currentRoom: string | null): void {
        if (currentRoom) {
            const payload: StateRequestedPayload = { requesterId: socket.id };
            socket.to(currentRoom).emit(SocketEvents.STATE_REQUESTED, payload);
        }
    }

    /**
     * Handles SEND_STATE event from client (room owner).
     *
     * Flow:
     * 1. Room owner emits SEND_STATE in response to STATE_REQUESTED
     * 2. Server sends GAME_STATE directly to the specified target player
     *
     * @param data - Contains targetId (recipient socket ID) and game state
     */
    private handleSendState(data: SendStatePayload): void {
        this.io.to(data.targetId).emit(SocketEvents.GAME_STATE, data.state);
    }

    /**
     * Handles socket disconnect event.
     *
     * Flow:
     * 1. Client disconnects (closes browser, network issue, etc.)
     * 2. Server emits PLAYER_LEFT to remaining room members
     *
     * @param socket - The disconnecting socket
     * @param currentRoom - Room the player was in (null if not in a room)
     */
    private handleDisconnect(socket: Socket, currentRoom: string | null): void {
        console.log(`Client disconnected: ${socket.id}`);
        if (currentRoom) {
            socket.to(currentRoom).emit(SocketEvents.PLAYER_LEFT);
        }
    }
}
