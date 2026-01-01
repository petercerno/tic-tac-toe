import Phaser from 'phaser';
import { GridConfig, ColorConfig, GameConfig, GraphicsConfig, toggleTheme } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import { GameHUD } from '../ui/GameHUD';
import { RoomModal } from '../ui/RoomModal';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager';
import type { GridPosition, WorldPosition, Player, RoomInfo, GameState } from '../types';

/**
 * Main game scene for Tic-Tac-Toe.
 * Manages the game grid, player symbols, win detection, camera controls,
 * theme switching, and multiplayer connectivity. Coordinates between
 * GameLogic for game state, GameHUD for user interface, and
 * MultiplayerManager for real-time synchronization.
 */
export default class GameScene extends Phaser.Scene {
    private gameLogic!: GameLogic;

    private isDragging: boolean = false;
    private startDragPoint: Phaser.Math.Vector2 | null = null;

    private gridGraphics!: Phaser.GameObjects.Graphics;
    private graphicsX!: Phaser.GameObjects.Graphics;
    private graphicsO!: Phaser.GameObjects.Graphics;
    private winLineGraphics!: Phaser.GameObjects.Graphics;

    private hud!: GameHUD;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;

    private multiplayerManager!: MultiplayerManager;
    private roomModal!: RoomModal;

    constructor() {
        super('game');
    }

    // ==================== Lifecycle Methods ====================

    /**
     * Core Phaser method called after the scene is initialized.
     * Sets up the game logic, graphics, UI, cameras, multiplayer, and input handling.
     */
    create() {
        this.gameLogic = new GameLogic({
            rows: GridConfig.GRID_SIZE,
            cols: GridConfig.GRID_SIZE,
            winSequence: GameConfig.WIN_CONDITION_COUNT
        });

        this.setupGraphics();
        this.setupHUD();
        this.setupCameras();
        this.setupMultiplayer();
        this.setupInputHandling();

        this.scale.on('resize', this.handleResize, this);
        this.events.on('shutdown', this.shutdown, this);
    }

    /**
     * Creates and initializes all game graphics objects.
     */
    private setupGraphics() {
        this.gridGraphics = this.add.graphics();
        this.graphicsX = this.add.graphics();
        this.graphicsO = this.add.graphics();
        this.winLineGraphics = this.add.graphics();
        this.drawGridLines();
    }

    /**
     * Initializes the HUD with callbacks for user interactions.
     */
    private setupHUD() {
        this.hud = new GameHUD(this, {
            onRestart: () => this.resetGame(),
            onToggleTheme: () => this.handleToggleTheme(),
            onZoom: (delta) => this.handleZoom(delta),
            onUndo: () => this.handleUndo(),
            onConnect: () => this.handleShowConnectModal(),
            onDisconnect: () => this.handleDisconnect()
        });
        this.hud.updateTurn(this.gameLogic.getCurrentPlayer());
    }

    /**
     * Configures main and UI cameras, sets up camera layering for HUD elements.
     */
    private setupCameras() {
        // Configure main camera
        this.cameras.main.setBackgroundColor(ColorConfig.GAME_BG);
        this.cameras.main.setBounds(0, 0, GridConfig.CANVAS_WIDTH, GridConfig.CANVAS_HEIGHT);
        this.centerCamera();

        // Create UI camera that won't be affected by zoom
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);

        // Configure camera layering: main camera ignores HUD, UI camera only shows HUD
        const hudElements = this.hud.getElements();
        this.cameras.main.ignore(hudElements);
        this.uiCamera.ignore(this.children.list.filter(child => !hudElements.includes(child)));
    }

    /**
     * Initializes multiplayer manager and room modal.
     */
    private setupMultiplayer() {
        this.multiplayerManager = new MultiplayerManager({
            onConnectionChange: (connected, roomInfo) => this.handleConnectionChange(connected, roomInfo),
            onStateReceived: (state) => this.handleStateReceived(state),
            onError: (message) => this.handleMultiplayerError(message),
            onPlayerLeft: () => this.handlePlayerLeft(),
            onPlayerJoined: (playerCount) => this.handlePlayerJoined(playerCount),
            onStateRequested: (requesterId) => this.handleStateRequested(requesterId)
        });

        this.roomModal = new RoomModal({
            onConnect: (roomName) => this.handleConnect(roomName),
            onCancel: () => { /* Modal handles its own cleanup */ }
        });
    }

    /**
     * Handles cleanup when the scene is shut down.
     * Removes the resize event listener and cleans up multiplayer.
     */
    private shutdown() {
        this.scale.off('resize', this.handleResize, this);
        this.multiplayerManager?.destroy();
        this.roomModal?.hide();
    }

    // ==================== Action Handlers ====================

    /**
     * Resets the game to its initial state.
     * Clears the board, resets zoom, centers camera, and broadcasts reset to other players.
     */
    private resetGame() {
        this.gameLogic.reset();
        this.redrawGameState();
        this.cameras.main.setZoom(1);
        this.centerCamera();
        this.broadcastState();
    }

    /**
     * Handles theme toggle: updates ColorConfig and refreshes all visual elements.
     */
    private handleToggleTheme() {
        toggleTheme();
        this.cameras.main.setBackgroundColor(ColorConfig.GAME_BG);
        this.drawGridLines();
        this.redrawGameState();
        this.hud.refresh();
        this.roomModal.refresh();
    }

    /**
     * Handles zoom: applies zoom delta to the main camera.
     * Clamps the zoom level to min/max bounds.
     * @param delta The zoom delta to apply (positive to zoom in, negative to zoom out).
     */
    private handleZoom(delta: number) {
        const currentZoom = this.cameras.main.zoom;
        const newZoom = Phaser.Math.Clamp(currentZoom + delta, GameConfig.ZOOM_MIN, GameConfig.ZOOM_MAX);
        this.cameras.main.setZoom(newZoom);
    }

    /**
     * Handles undo: reverts the last move and updates the display.
     * Broadcasts the updated state to other players.
     */
    private handleUndo() {
        if (this.gameLogic.undoLastMove()) {
            this.redrawGameState();
            this.broadcastState();
        }
    }

    // ==================== Multiplayer Handlers ====================

    /**
     * Shows the room name modal.
     */
    private handleShowConnectModal() {
        this.roomModal.show();
    }

    /**
     * Handles connect button click from modal.
     */
    private async handleConnect(roomName: string) {
        try {
            await this.multiplayerManager.connect(roomName);
            this.roomModal.hide();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Connection failed';
            this.roomModal.showError(message);
        }
    }

    /**
     * Handles disconnect button click.
     */
    private handleDisconnect() {
        this.multiplayerManager.disconnect();
    }

    /**
     * Handles connection status changes.
     */
    private handleConnectionChange(connected: boolean, roomInfo?: RoomInfo) {
        this.hud.updateConnectionStatus(connected, roomInfo);
    }

    /**
     * Handles receiving game state from another player.
     */
    private handleStateReceived(state: GameState) {
        this.gameLogic.setState(state);
        this.redrawGameState();
    }

    /**
     * Handles multiplayer errors.
     */
    private handleMultiplayerError(message: string) {
        console.error('Multiplayer error:', message);
        // Could show a toast notification here
    }

    /**
     * Handles when another player leaves the room.
     */
    private handlePlayerLeft() {
        // Update connection status to show only one player
        const roomInfo = this.multiplayerManager.getRoomInfo();
        if (roomInfo) {
            this.hud.updateConnectionStatus(true, roomInfo);
        }
    }

    /**
     * Handles when another player joins the room.
     */
    private handlePlayerJoined(_playerCount: number) {
        const roomInfo = this.multiplayerManager.getRoomInfo();
        if (roomInfo) {
            this.hud.updateConnectionStatus(true, roomInfo);
        }
    }

    /**
     * Handles when another player requests the current state.
     * Sends the current game state directly to the requesting player.
     *
     * @param requesterId - Socket ID of the player who requested state
     */
    private handleStateRequested(requesterId: string) {
        // Send current state directly to the requesting player
        if (this.multiplayerManager.isConnected()) {
            this.multiplayerManager.sendStateTo(requesterId, this.gameLogic.getState());
        }
    }

    /**
     * Broadcasts the current game state to other players.
     */
    private broadcastState() {
        if (this.multiplayerManager.isConnected()) {
            this.multiplayerManager.broadcastState(this.gameLogic.getState());
        }
    }

    // ==================== Input Handling ====================

    /**
     * Sets up input handling for the game.
     * Handles pointer events for camera panning and grid placement.
     */
    private setupInputHandling() {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.startDragPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
            this.isDragging = false;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown && this.startDragPoint) {
                const scrollX = this.cameras.main.scrollX - (pointer.x - pointer.prevPosition.x);
                const scrollY = this.cameras.main.scrollY - (pointer.y - pointer.prevPosition.y);
                this.cameras.main.setScroll(scrollX, scrollY);

                if (this.startDragPoint.distance(pointer.position) > GameConfig.DRAG_THRESHOLD) {
                    this.isDragging = true;
                }
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (!this.isDragging) {
                this.handleGridClick(pointer);
            }
            this.startDragPoint = null;
            this.isDragging = false;
        });

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, deltaX: number, deltaY: number, _deltaZ: number) => {
            this.cameras.main.scrollX += deltaX;
            this.cameras.main.scrollY += deltaY;
        });

        const restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        restartKey?.on('down', () => this.resetGame());

        // Define keyboard bindings: [keyCode, handler]
        const keyBindings: [number, () => void][] = [
            [Phaser.Input.Keyboard.KeyCodes.PLUS, () => this.handleZoom(GameConfig.ZOOM_STEP)],
            [Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD, () => this.handleZoom(GameConfig.ZOOM_STEP)],
            [Phaser.Input.Keyboard.KeyCodes.MINUS, () => this.handleZoom(-GameConfig.ZOOM_STEP)],
            [Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT, () => this.handleZoom(-GameConfig.ZOOM_STEP)],
            [Phaser.Input.Keyboard.KeyCodes.BACKSPACE, () => this.handleUndo()],
        ];

        for (const [keyCode, handler] of keyBindings) {
            this.input.keyboard?.addKey(keyCode)?.on('down', handler);
        }
    }

    /**
     * Handles grid cell clicks for placing marks.
     * Ignores clicks on the UI header or if the game is over.
     * @param pointer The pointer object from Phaser input.
     */
    private handleGridClick(pointer: Phaser.Input.Pointer) {
        const screenHeight = this.scale.height;
        // Ignore inputs on the UI panels (top and bottom)
        if (pointer.y <= GridConfig.UI_HEIGHT || pointer.y >= screenHeight - GridConfig.UI_HEIGHT) return;

        if (this.gameLogic.isGameOver()) return;

        // Adjust pointer coordinates for camera scroll
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const gridPosition = this.worldToGrid(worldPoint.x, worldPoint.y);

        if (this.gameLogic.makeMove(gridPosition)) {
            this.redrawGameState();
            this.broadcastState();
        }
    }

    /**
     * Handles window resize events to update the UI and button positions.
     * @param gameSize The new size of the game canvas.
     */
    private handleResize(gameSize: Phaser.Structs.Size) {
        if (this.hud) {
            this.hud.handleResize(gameSize.width, gameSize.height);
        }
    }

    // ==================== Rendering ====================

    /**
     * Fully redraws all game graphics based on current GameLogic state.
     * Redraws all symbols, the winning line (if any), and updates the HUD.
     */
    private redrawGameState() {
        // Redraw all symbols from move history
        this.graphicsX.clear();
        this.graphicsO.clear();
        for (const move of this.gameLogic.getMoveHistory()) {
            this.drawSymbol(move.position, move.player);
        }

        // Redraw winning line if game is won, clear otherwise
        const winResult = this.gameLogic.getWinResult();
        if (winResult) {
            this.drawWinningLine(winResult.start, winResult.end);
            this.hud.showWin(winResult);
        } else {
            this.winLineGraphics.clear();
            this.hud.updateTurn(this.gameLogic.getCurrentPlayer());
        }
    }

    /**
     * Draws the grid lines using current theme colors.
     */
    private drawGridLines() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(GraphicsConfig.GRID_LINE_WIDTH, ColorConfig.GRID, GraphicsConfig.GRID_ALPHA);

        // Draw vertical lines
        for (let x = 0; x <= GridConfig.GRID_SIZE; x++) {
            this.gridGraphics.moveTo(GridConfig.MARGIN + x * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN);
            this.gridGraphics.lineTo(GridConfig.MARGIN + x * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN + GridConfig.GRID_SIZE * GridConfig.CELL_SIZE);
        }

        // Draw horizontal lines
        for (let y = 0; y <= GridConfig.GRID_SIZE; y++) {
            this.gridGraphics.moveTo(GridConfig.MARGIN, GridConfig.TOP_MARGIN + y * GridConfig.CELL_SIZE);
            this.gridGraphics.lineTo(GridConfig.MARGIN + GridConfig.GRID_SIZE * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN + y * GridConfig.CELL_SIZE);
        }

        this.gridGraphics.strokePath();
    }

    /**
     * Draws the player's symbol (X or O) at the specified grid coordinates.
     * @param position The grid position to draw at.
     * @param player The player symbol ('X' or 'O').
     */
    private drawSymbol(position: GridPosition, player: Player) {
        const center = this.gridToWorld(position);

        if (player === 'X') {
            this.graphicsX.lineStyle(GraphicsConfig.SYMBOL_LINE_WIDTH, ColorConfig.PLAYER_X, 1);
            this.graphicsX.moveTo(center.x - GraphicsConfig.SYMBOL_X_SIZE, center.y - GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.lineTo(center.x + GraphicsConfig.SYMBOL_X_SIZE, center.y + GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.moveTo(center.x + GraphicsConfig.SYMBOL_X_SIZE, center.y - GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.lineTo(center.x - GraphicsConfig.SYMBOL_X_SIZE, center.y + GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.strokePath();
        } else {
            this.graphicsO.lineStyle(GraphicsConfig.SYMBOL_LINE_WIDTH, ColorConfig.PLAYER_O, 1);
            this.graphicsO.strokeCircle(center.x, center.y, GraphicsConfig.SYMBOL_O_RADIUS);
        }
    }

    /**
     * Draws a line connecting the start and end points of the winning sequence.
     * @param start The starting grid coordinates of the winning line.
     * @param end The ending grid coordinates of the winning line.
     */
    private drawWinningLine(start: GridPosition, end: GridPosition) {
        this.winLineGraphics.clear();
        this.winLineGraphics.setAlpha(GraphicsConfig.WIN_LINE_ALPHA);
        const thickness = GraphicsConfig.WIN_LINE_THICKNESS;

        this.winLineGraphics.lineStyle(thickness, ColorConfig.WIN, 1);
        this.winLineGraphics.fillStyle(ColorConfig.WIN, 1);

        const startWorld = this.gridToWorld(start);
        const endWorld = this.gridToWorld(end);

        this.winLineGraphics.moveTo(startWorld.x, startWorld.y);
        this.winLineGraphics.lineTo(endWorld.x, endWorld.y);
        this.winLineGraphics.strokePath();

        // Add round caps
        this.winLineGraphics.fillCircle(startWorld.x, startWorld.y, thickness / 2);
        this.winLineGraphics.fillCircle(endWorld.x, endWorld.y, thickness / 2);
    }

    // ==================== Camera ====================

    /**
     * Centers the camera on the game grid.
     */
    private centerCamera() {
        const centerX = GridConfig.MARGIN + (GridConfig.GRID_SIZE * GridConfig.CELL_SIZE) / 2;
        const centerY = GridConfig.TOP_MARGIN + (GridConfig.GRID_SIZE * GridConfig.CELL_SIZE) / 2;
        this.cameras.main.centerOn(centerX, centerY);
    }

    // ==================== Coordinate Utilities ====================

    /**
     * Converts grid coordinates to world coordinates (center of the cell).
     * @param position The grid position.
     * @returns The world coordinates in pixels.
     */
    private gridToWorld(position: GridPosition): WorldPosition {
        const x = GridConfig.MARGIN + position.x * GridConfig.CELL_SIZE + GridConfig.CELL_SIZE / 2;
        const y = GridConfig.TOP_MARGIN + position.y * GridConfig.CELL_SIZE + GridConfig.CELL_SIZE / 2;
        return { x, y };
    }

    /**
     * Converts world coordinates to grid coordinates.
     * @param worldX The world x-coordinate in pixels.
     * @param worldY The world y-coordinate in pixels.
     * @returns The grid cell coordinates.
     */
    private worldToGrid(worldX: number, worldY: number): GridPosition {
        const startX = GridConfig.MARGIN;
        const startY = GridConfig.TOP_MARGIN;
        const x = Math.floor((worldX - startX) / GridConfig.CELL_SIZE);
        const y = Math.floor((worldY - startY) / GridConfig.CELL_SIZE);
        return { x, y };
    }
}
