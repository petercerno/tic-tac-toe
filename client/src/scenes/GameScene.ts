import Phaser from 'phaser';
import { GridConfig, ColorConfig, GameConfig, GraphicsConfig, toggleTheme } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import { GameHUD } from '../ui/GameHUD';
import type { GridPosition, WorldPosition, Player, WinResult } from '../types';

/**
 * Main game scene for Tic-Tac-Toe.
 * Manages the game grid, player symbols, win detection, camera controls,
 * and theme switching. Coordinates between GameLogic for game state
 * and GameHUD for user interface elements.
 */
export default class GameScene extends Phaser.Scene {
    private gameLogic!: GameLogic;
    private lastWinResult: WinResult | null = null;

    private isDragging: boolean = false;
    private startDragPoint: Phaser.Math.Vector2 | null = null;

    private gridGraphics!: Phaser.GameObjects.Graphics;
    private graphicsX!: Phaser.GameObjects.Graphics;
    private graphicsO!: Phaser.GameObjects.Graphics;
    private winLineGraphics!: Phaser.GameObjects.Graphics;

    private hud!: GameHUD;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;

    constructor() {
        super('game');
    }

    /**
     * Core Phaser method called after the scene is initialized.
     * Sets up the grid, UI, input handling, and camera.
     */
    create() {
        // Initialize game logic
        this.gameLogic = new GameLogic({
            rows: GridConfig.GRID_SIZE,
            cols: GridConfig.GRID_SIZE,
            winSequence: GameConfig.WIN_CONDITION_COUNT
        });
        // Reset state that may persist across scene restarts
        this.lastWinResult = null;

        // Apply current theme colors
        this.cameras.main.setBackgroundColor(ColorConfig.GAME_BG);

        // Create all game graphics objects
        this.gridGraphics = this.add.graphics();
        this.graphicsX = this.add.graphics();
        this.graphicsO = this.add.graphics();
        this.winLineGraphics = this.add.graphics();
        this.drawGridLines();

        // Initialize HUD with callbacks for user interactions
        this.hud = new GameHUD(this, {
            onRestart: () => this.resetGame(),
            onToggleTheme: () => this.handleToggleTheme(),
            onZoom: (delta) => this.handleZoom(delta),
            onUndo: () => this.handleUndo()
        });
        this.hud.updateTurn(this.gameLogic.getCurrentPlayer());

        // Create UI camera that won't be affected by zoom
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        this.uiCamera.setScroll(0, 0);

        // Main camera ignores HUD elements, UI camera only shows HUD
        const hudElements = this.hud.getElements();
        this.cameras.main.ignore(hudElements);
        this.uiCamera.ignore(this.children.list.filter(child => !hudElements.includes(child)));

        this.cameras.main.setBounds(0, 0, GridConfig.CANVAS_WIDTH, GridConfig.CANVAS_HEIGHT);
        this.setupInputHandling();
        this.centerCamera();
        this.scale.on('resize', this.handleResize, this);
        this.events.on('shutdown', this.shutdown, this);
    }

    /**
     * Resets the game to its initial state.
     * Restarts the scene.
     */
    private resetGame() {
        this.scene.restart();
    }

    /**
     * Handles theme toggle: updates ColorConfig and refreshes all visual elements.
     */
    private handleToggleTheme() {
        toggleTheme();
        this.cameras.main.setBackgroundColor(ColorConfig.GAME_BG);
        this.drawGridLines();
        this.redrawSymbols();
        if (this.lastWinResult) {
            this.drawWinningLine(this.lastWinResult.start, this.lastWinResult.end);
            this.hud.showWin(this.lastWinResult);
        } else {
            this.hud.updateTurn(this.gameLogic.getCurrentPlayer());
        }
        this.hud.refresh();
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
     * Redraws all placed symbols with current theme colors.
     */
    private redrawSymbols() {
        this.graphicsX.clear();
        this.graphicsO.clear();
        for (let x = 0; x < GridConfig.GRID_SIZE; x++) {
            for (let y = 0; y < GridConfig.GRID_SIZE; y++) {
                const position: GridPosition = { x, y };
                const cell = this.gameLogic.getCell(position);
                if (cell) {
                    this.drawSymbol(position, cell);
                }
            }
        }
    }

    /**
     * Handles undo: reverts the last move and updates the display.
     */
    private handleUndo() {
        const undoneMove = this.gameLogic.undoLastMove();
        if (undoneMove) {
            // Clear the winning line if the game was won
            if (this.lastWinResult) {
                this.winLineGraphics.clear();
                this.lastWinResult = null;
            }
            // Redraw all symbols to reflect the undone move
            this.redrawSymbols();
            // Update the turn indicator
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
     * Handles pointer input for placing marks on the grid.
     * Ignores clicks on the UI header or if the game is over.
     * @param pointer The pointer object from Phaser input.
     */
    private handleInput(pointer: Phaser.Input.Pointer) {
        // Ignore inputs on the UI header
        if (pointer.y <= GridConfig.UI_HEIGHT) return;

        if (this.gameLogic.isGameOver()) return;

        // Adjust pointer coordinates for camera scroll
        const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
        const gridPosition = this.worldToGrid(worldPoint.x, worldPoint.y);
        const result = this.gameLogic.makeMove(gridPosition);

        if (result.success) {
            // Get the symbol of the player who made the move
            const playerSymbol = this.gameLogic.getCell(gridPosition) as Player;
            this.drawSymbol(gridPosition, playerSymbol);

            if (result.win) {
                this.lastWinResult = result.win;
                this.drawWinningLine(result.win.start, result.win.end);
                this.hud.showWin(result.win);
            } else {
                this.hud.updateTurn(this.gameLogic.getCurrentPlayer());
            }
        }
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
                this.handleInput(pointer);
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

        // Zoom in with + key, zoom out with - key (both regular and numpad)
        const zoomInKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        zoomInKey?.on('down', () => this.handleZoom(GameConfig.ZOOM_STEP));
        const zoomInNumpad = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD);
        zoomInNumpad?.on('down', () => this.handleZoom(GameConfig.ZOOM_STEP));
        const zoomOutKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);
        zoomOutKey?.on('down', () => this.handleZoom(-GameConfig.ZOOM_STEP));
        const zoomOutNumpad = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_SUBTRACT);
        zoomOutNumpad?.on('down', () => this.handleZoom(-GameConfig.ZOOM_STEP));

        // Undo with Backspace key
        const undoKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        undoKey?.on('down', () => this.handleUndo());
    }

    /**
     * Centers the camera on the game grid.
     */
    private centerCamera() {
        const centerX = GridConfig.MARGIN + (GridConfig.GRID_SIZE * GridConfig.CELL_SIZE) / 2;
        const centerY = GridConfig.TOP_MARGIN + (GridConfig.GRID_SIZE * GridConfig.CELL_SIZE) / 2;
        this.cameras.main.centerOn(centerX, centerY);
    }

    /**
     * Handles window resize events to update the UI and button positions.
     * @param gameSize The new size of the game canvas.
     */
    private handleResize(gameSize: Phaser.Structs.Size) {
        if (this.hud) {
            this.hud.handleResize(gameSize.width);
        }
    }

    /**
     * Handles cleanup when the scene is shut down.
     * Removes the resize event listener.
     */
    private shutdown() {
        this.scale.off('resize', this.handleResize, this);
    }

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
