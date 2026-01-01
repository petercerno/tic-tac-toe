import { io, Socket } from 'socket.io-client';
import type { GameState, RoomInfo } from '../types';
import { MultiplayerConfig } from '../constants';
import {
    SocketEvents,
    type JoinRoomResponse,
    type PlayerJoinedPayload,
    type SendStatePayload,
    type StateRequestedPayload,
} from '@shared/index';

/**
 * Callback functions for multiplayer events.
 */
export interface MultiplayerCallbacks {
    /** Called when connection status changes. */
    onConnectionChange: (connected: boolean, roomInfo?: RoomInfo) => void;
    /** Called when game state is received from another player. */
    onStateReceived: (state: GameState) => void;
    /** Called when an error occurs. */
    onError: (message: string) => void;
    /** Called when the other player leaves the room. */
    onPlayerLeft: () => void;
    /** Called when another player joins the room. */
    onPlayerJoined: (playerCount: number) => void;
    /**
     * Called when state is requested by another player.
     * @param requesterId - Socket ID of the player requesting state (use with sendStateTo)
     */
    onStateRequested: (requesterId: string) => void;
    /** Called when the room times out due to inactivity. */
    onRoomTimeout: () => void;
}

/**
 * Manages WebSocket connection for multiplayer functionality.
 * Handles room joining/leaving and game state synchronization.
 */
export class MultiplayerManager {
    private socket: Socket | null = null;
    private callbacks: MultiplayerCallbacks;
    private currentRoom: RoomInfo | null = null;
    private isRoomOwner: boolean = false;

    constructor(callbacks: MultiplayerCallbacks) {
        this.callbacks = callbacks;
    }

    // ==================== Public Accessors ====================

    /**
     * Checks if currently connected to a room.
     *
     * @returns true if socket is connected AND currently in a room
     */
    public isConnected(): boolean {
        return this.socket?.connected === true && this.currentRoom !== null;
    }

    /**
     * Gets the current room info if connected.
     *
     * @returns RoomInfo object with room name, ownership status, and player count, or null if not in a room
     */
    public getRoomInfo(): RoomInfo | null {
        return this.currentRoom;
    }

    /**
     * Checks if this client is the room owner (first player to join).
     *
     * @returns true if this client created/owns the room
     */
    public getIsRoomOwner(): boolean {
        return this.isRoomOwner;
    }

    // ==================== Connection Management ====================

    /**
     * Connects to a room. Creates the room if it doesn't exist.
     *
     * Flow:
     * 1. Creates socket connection to server (if not already connected)
     * 2. Emits JOIN_ROOM to server
     * 3. Server responds with JoinRoomResponse via callback
     * 4. If not room owner, emits REQUEST_STATE to get current game state
     *
     * @param roomName - The name of the room to join
     * @returns Promise that resolves on successful join, rejects on failure
     */
    public async connect(roomName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Create socket connection if not exists
            if (!this.socket) {
                this.socket = io(MultiplayerConfig.SERVER_URL, {
                    transports: ['websocket', 'polling']
                });
                this.setupEventListeners();
            }

            // Wait for connection then join room
            if (this.socket.connected) {
                this.joinRoom(roomName, resolve, reject);
            } else {
                this.socket.once('connect', () => {
                    this.joinRoom(roomName, resolve, reject);
                });
                this.socket.once('connect_error', (error) => {
                    reject(new Error(`Connection failed: ${error.message}`));
                });
            }
        });
    }

    /**
     * Disconnects from the current room.
     *
     * Flow:
     * 1. Emits LEAVE_ROOM to server
     * 2. Server notifies other players via PLAYER_LEFT
     * 3. Clears local room state and notifies via onConnectionChange callback
     */
    public disconnect(): void {
        if (this.socket && this.currentRoom) {
            this.socket.emit(SocketEvents.LEAVE_ROOM);
            this.resetState();
            this.callbacks.onConnectionChange(false);
        }
    }

    /**
     * Cleans up the socket connection and resets all state.
     *
     * Should be called when the multiplayer manager is no longer needed
     * (e.g., when leaving the game scene).
     */
    public destroy(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.resetState();
    }

    // ==================== State Broadcasting ====================

    /**
     * Broadcasts the current game state to other players in the room.
     *
     * Flow:
     * 1. Client emits GAME_STATE to server
     * 2. Server relays GAME_STATE to all other players in the room
     * 3. Other players receive state via onStateReceived callback
     *
     * @param state - The complete game state to broadcast
     */
    public broadcastState(state: GameState): void {
        if (this.socket && this.currentRoom) {
            this.socket.emit(SocketEvents.GAME_STATE, state);
        }
    }

    /**
     * Sends state to a specific player (response to STATE_REQUESTED).
     *
     * Flow:
     * 1. Room owner emits SEND_STATE with target player's socket ID
     * 2. Server sends GAME_STATE directly to the specified player
     * 3. Target player receives state via onStateReceived callback
     *
     * @param targetId - Socket ID of the player who requested state
     * @param state - The complete game state to send
     */
    public sendStateTo(targetId: string, state: GameState): void {
        if (this.socket) {
            const payload: SendStatePayload<GameState> = { targetId, state };
            this.socket.emit(SocketEvents.SEND_STATE, payload);
        }
    }

    // ==================== Private Helpers ====================

    /**
     * Joins a room after socket connection is established.
     *
     * Emits JOIN_ROOM to server and handles the acknowledgment callback.
     * If joining as non-owner, automatically requests current game state.
     *
     * @param roomName - Room name to join
     * @param resolve - Promise resolve callback for successful join
     * @param reject - Promise reject callback for failed join
     */
    private joinRoom(
        roomName: string,
        resolve: () => void,
        reject: (error: Error) => void
    ): void {
        this.socket!.emit(SocketEvents.JOIN_ROOM, roomName, (response: JoinRoomResponse) => {
            if (response.success) {
                this.isRoomOwner = response.isRoomOwner ?? false;
                this.currentRoom = {
                    roomName,
                    isRoomOwner: this.isRoomOwner,
                    playerCount: response.playerCount ?? 1
                };
                this.callbacks.onConnectionChange(true, this.currentRoom);

                // If not room owner, request current state from owner
                if (!this.isRoomOwner) {
                    this.socket!.emit(SocketEvents.REQUEST_STATE);
                }

                resolve();
            } else {
                reject(new Error(response.error ?? 'Failed to join room'));
            }
        });
    }

    /**
     * Sets up Socket.IO event listeners for incoming server events.
     *
     * Registers handlers for:
     * - GAME_STATE: Received game state from another player
     * - PLAYER_LEFT: Other player disconnected or left
     * - PLAYER_JOINED: New player joined the room
     * - STATE_REQUESTED: New player needs current game state (owner only)
     * - disconnect: Connection to server lost
     * - connect_error: Connection error occurred
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on(SocketEvents.GAME_STATE, (state: GameState) => {
            this.callbacks.onStateReceived(state);
        });

        this.socket.on(SocketEvents.PLAYER_LEFT, () => {
            if (this.currentRoom) {
                this.currentRoom.playerCount = Math.max(1, this.currentRoom.playerCount - 1);
                // If other player left, this client becomes the owner
                this.isRoomOwner = true;
                this.currentRoom.isRoomOwner = true;
            }
            this.callbacks.onPlayerLeft();
        });

        this.socket.on(SocketEvents.PLAYER_JOINED, (data: PlayerJoinedPayload) => {
            if (this.currentRoom) {
                this.currentRoom.playerCount = data.playerCount;
            }
            this.callbacks.onPlayerJoined(data.playerCount);
        });

        this.socket.on(SocketEvents.STATE_REQUESTED, (data: StateRequestedPayload) => {
            this.callbacks.onStateRequested(data.requesterId);
        });

        this.socket.on(SocketEvents.ROOM_TIMEOUT, () => {
            // Clean up socket completely so a fresh connection can be created
            this.socket?.disconnect();
            this.socket = null;
            this.resetState();
            this.callbacks.onRoomTimeout();
        });

        this.socket.on('disconnect', () => {
            this.resetState();
            this.callbacks.onConnectionChange(false);
        });

        this.socket.on('connect_error', (error) => {
            this.callbacks.onError(`Connection error: ${error.message}`);
        });
    }

    /**
     * Resets the local room state.
     *
     * Called when leaving a room, disconnecting, or destroying the manager.
     *
     * @returns void
     */
    private resetState(): void {
        this.currentRoom = null;
        this.isRoomOwner = false;
    }
}
