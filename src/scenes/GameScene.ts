import Phaser from 'phaser';
import { GridConfig, ColorConfig, GameConfig, GraphicsConfig } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import { GameHUD } from '../ui/GameHUD';
import type { Player } from '../types';

export default class GameScene extends Phaser.Scene {
    private gameLogic!: GameLogic;
    private hud!: GameHUD;

    private isDragging: boolean = false;
    private startDragPoint: Phaser.Math.Vector2 | null = null;

    private graphicsX!: Phaser.GameObjects.Graphics;
    private graphicsO!: Phaser.GameObjects.Graphics;

    constructor() {
        super('game');
    }

    /**
     * Core Phaser method called after the scene is initialized.
     * Sets up the grid, UI, input handling, and camera.
     */
    create() {
        this.gameLogic = new GameLogic({
            rows: GridConfig.GRID_SIZE,
            cols: GridConfig.GRID_SIZE,
            winSequence: GameConfig.WIN_CONDITION_COUNT
        });

        this.createGrid();

        // Initialize HUD
        this.hud = new GameHUD(this, () => this.resetGame());

        // Start game state
        this.hud.updateTurn(this.gameLogic.getCurrentPlayer());

        this.graphicsX = this.add.graphics();
        this.graphicsO = this.add.graphics();
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
     * Draws the tic-tac-toe grid lines on the screen.
     * Initializes the internal grid state.
     */
    private createGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(GraphicsConfig.GRID_LINE_WIDTH, ColorConfig.GRID, GraphicsConfig.GRID_ALPHA);

        // Draw vertical lines
        for (let x = 0; x <= GridConfig.GRID_SIZE; x++) {
            graphics.moveTo(GridConfig.MARGIN + x * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN);
            graphics.lineTo(GridConfig.MARGIN + x * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN + GridConfig.GRID_SIZE * GridConfig.CELL_SIZE);
        }

        // Draw horizontal lines
        for (let y = 0; y <= GridConfig.GRID_SIZE; y++) {
            graphics.moveTo(GridConfig.MARGIN, GridConfig.TOP_MARGIN + y * GridConfig.CELL_SIZE);
            graphics.lineTo(GridConfig.MARGIN + GridConfig.GRID_SIZE * GridConfig.CELL_SIZE, GridConfig.TOP_MARGIN + y * GridConfig.CELL_SIZE);
        }

        graphics.strokePath();
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
        const { x: gridX, y: gridY } = this.worldToGrid(worldPoint.x, worldPoint.y);
        const result = this.gameLogic.makeMove(gridX, gridY);

        if (result.success) {
            // Get the symbol of the player who made the move
            const playerSymbol = this.gameLogic.getCell(gridX, gridY) as Player;
            this.drawSymbol(gridX, gridY, playerSymbol);

            if (result.win) {
                this.drawWinningLine(result.win.start, result.win.end);
                this.hud.showWin(result.win);
            } else {
                this.hud.updateTurn(this.gameLogic.getCurrentPlayer());
            }
        }
    }

    /**
     * Draws the player's symbol (X or O) at the specified grid coordinates.
     * @param x The grid x-coordinate.
     * @param y The grid y-coordinate.
     * @param player The player symbol ('X' or 'O').
     */
    private drawSymbol(x: number, y: number, player: 'X' | 'O') {
        const { x: centerX, y: centerY } = this.gridToWorld(x, y);

        if (player === 'X') {
            this.graphicsX.lineStyle(GraphicsConfig.SYMBOL_LINE_WIDTH, ColorConfig.PLAYER_X, 1);
            this.graphicsX.moveTo(centerX - GraphicsConfig.SYMBOL_X_SIZE, centerY - GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.lineTo(centerX + GraphicsConfig.SYMBOL_X_SIZE, centerY + GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.moveTo(centerX + GraphicsConfig.SYMBOL_X_SIZE, centerY - GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.lineTo(centerX - GraphicsConfig.SYMBOL_X_SIZE, centerY + GraphicsConfig.SYMBOL_X_SIZE);
            this.graphicsX.strokePath();
        } else {
            this.graphicsO.lineStyle(GraphicsConfig.SYMBOL_LINE_WIDTH, ColorConfig.PLAYER_O, 1);
            this.graphicsO.strokeCircle(centerX, centerY, GraphicsConfig.SYMBOL_O_RADIUS);
        }
    }

    /**
     * Draws a line connecting the start and end points of the winning sequence.
     * @param start The starting grid coordinates of the winning line.
     * @param end The ending grid coordinates of the winning line.
     */
    private drawWinningLine(start: { x: number, y: number }, end: { x: number, y: number }) {
        const graphics = this.add.graphics();
        graphics.setAlpha(GraphicsConfig.WIN_LINE_ALPHA); // Global alpha to avoid overlap artifacts
        const thickness = GraphicsConfig.WIN_LINE_THICKNESS;

        graphics.lineStyle(thickness, ColorConfig.WIN, 1);
        graphics.fillStyle(ColorConfig.WIN, 1);

        const { x: startX, y: startY } = this.gridToWorld(start.x, start.y);
        const { x: endX, y: endY } = this.gridToWorld(end.x, end.y);

        graphics.moveTo(startX, startY);
        graphics.lineTo(endX, endY);
        graphics.strokePath();

        // Add round caps
        graphics.fillCircle(startX, startY, thickness / 2);
        graphics.fillCircle(endX, endY, thickness / 2);
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
     * @param gridX The grid x-coordinate.
     * @param gridY The grid y-coordinate.
     * @returns The world coordinates { x, y }.
     */
    private gridToWorld(gridX: number, gridY: number): { x: number, y: number } {
        const x = GridConfig.MARGIN + gridX * GridConfig.CELL_SIZE + GridConfig.CELL_SIZE / 2;
        const y = GridConfig.TOP_MARGIN + gridY * GridConfig.CELL_SIZE + GridConfig.CELL_SIZE / 2;
        return { x, y };
    }

    /**
     * Converts world coordinates to grid coordinates.
     * @param worldX The world x-coordinate.
     * @param worldY The world y-coordinate.
     * @returns The grid coordinates { x, y }.
     */
    private worldToGrid(worldX: number, worldY: number): { x: number, y: number } {
        const startX = GridConfig.MARGIN;
        const startY = GridConfig.TOP_MARGIN;
        const x = Math.floor((worldX - startX) / GridConfig.CELL_SIZE);
        const y = Math.floor((worldY - startY) / GridConfig.CELL_SIZE);
        return { x, y };
    }
}
