import { io, Socket } from 'socket.io-client';
import type { GameState, RoomInfo } from '../types';
import { MultiplayerConfig } from '../constants';

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
    /** Called when state is requested by another player. */
    onStateRequested: () => void;
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

    /**
     * Checks if currently connected to a room.
     */
    public isConnected(): boolean {
        return this.socket?.connected === true && this.currentRoom !== null;
    }

    /**
     * Gets the current room info if connected.
     */
    public getRoomInfo(): RoomInfo | null {
        return this.currentRoom;
    }

    /**
     * Checks if this client is the room owner.
     */
    public getIsRoomOwner(): boolean {
        return this.isRoomOwner;
    }

    /**
     * Connects to a room. Creates the room if it doesn't exist.
     * @param roomName The name of the room to join.
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
     * Joins a room after socket connection is established.
     */
    private joinRoom(
        roomName: string,
        resolve: () => void,
        reject: (error: Error) => void
    ): void {
        this.socket!.emit('join-room', roomName, (response: {
            success: boolean;
            error?: string;
            isRoomOwner?: boolean;
            playerCount?: number;
        }) => {
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
                    this.socket!.emit('request-state');
                }

                resolve();
            } else {
                reject(new Error(response.error ?? 'Failed to join room'));
            }
        });
    }

    /**
     * Disconnects from the current room.
     */
    public disconnect(): void {
        if (this.socket && this.currentRoom) {
            this.socket.emit('leave-room');
            this.currentRoom = null;
            this.isRoomOwner = false;
            this.callbacks.onConnectionChange(false);
        }
    }

    /**
     * Broadcasts the current game state to other players in the room.
     * @param state The game state to broadcast.
     */
    public broadcastState(state: GameState): void {
        if (this.socket && this.currentRoom) {
            this.socket.emit('game-state', state);
        }
    }

    /**
     * Sends state to a specific player (response to state request).
     * @param targetId The socket ID of the player to send state to.
     * @param state The game state to send.
     */
    public sendStateTo(targetId: string, state: GameState): void {
        if (this.socket) {
            this.socket.emit('send-state', { targetId, state });
        }
    }

    /**
     * Sets up Socket.IO event listeners.
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on('game-state', (state: GameState) => {
            this.callbacks.onStateReceived(state);
        });

        this.socket.on('player-left', () => {
            if (this.currentRoom) {
                this.currentRoom.playerCount = Math.max(1, this.currentRoom.playerCount - 1);
                // If other player left, this client becomes the owner
                this.isRoomOwner = true;
                this.currentRoom.isRoomOwner = true;
            }
            this.callbacks.onPlayerLeft();
        });

        this.socket.on('player-joined', (data: { playerCount: number }) => {
            if (this.currentRoom) {
                this.currentRoom.playerCount = data.playerCount;
            }
            this.callbacks.onPlayerJoined(data.playerCount);
        });

        this.socket.on('state-requested', () => {
            this.callbacks.onStateRequested();
        });

        this.socket.on('disconnect', () => {
            this.currentRoom = null;
            this.isRoomOwner = false;
            this.callbacks.onConnectionChange(false);
        });

        this.socket.on('connect_error', (error) => {
            this.callbacks.onError(`Connection error: ${error.message}`);
        });
    }

    /**
     * Cleans up the socket connection.
     */
    public destroy(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.currentRoom = null;
        this.isRoomOwner = false;
    }
}
