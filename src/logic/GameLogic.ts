import type { Cell, Player, WinResult, GridDimensions } from '../types';

/**
 * Core game logic for Tic-Tac-Toe.
 * Manages the game grid, player turns, move history, win detection,
 * and undo functionality. This class is UI-independent and handles
 * only the game state and rules.
 */
export class GameLogic {
    private grid: Cell[][] = [];
    private dimensions: GridDimensions;
    private currentPlayer: Player = 'X';
    private gameOver: boolean = false;
    private moveHistory: { x: number, y: number, player: Player }[] = [];

    // Static constant for win check directions
    private static readonly WIN_CHECK_DIRECTIONS = [
        [1, 0],  // Horizontal -
        [0, 1],  // Vertical |
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
    ];

    /**
     * Initializes the game logic with the specified dimensions and win condition.
     * @param dimensions Object containing rows, columns, and win sequence length.
     */
    constructor(dimensions: GridDimensions) {
        this.dimensions = dimensions;
        this.reset();
    }

    /**
     * Resets the game state to the initial values.
     * Clears the grid, sets the current player to 'X', and resets the game over flag.
     */
    public reset(): void {
        this.grid = [];
        for (let y = 0; y < this.dimensions.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.dimensions.cols; x++) {
                this.grid[y][x] = '';
            }
        }
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.moveHistory = [];
    }

    /**
     * Gets the symbol of the player whose turn it currently is.
     * @returns The current player ('X' or 'O').
     */
    public getCurrentPlayer(): Player {
        return this.currentPlayer;
    }

    /**
     * Checks if the game has ended.
     * @returns True if the game is over, false otherwise.
     */
    public isGameOver(): boolean {
        return this.gameOver;
    }

    /**
     * Retrieves the content of a specific cell in the grid.
     * @param x The grid x-coordinate (column).
     * @param y The grid y-coordinate (row).
     * @returns The cell content ('X', 'O', or ''). Returns '' if coordinates are invalid.
     */
    public getCell(x: number, y: number): Cell {
        if (!this.isValidCell(x, y)) {
            return '';
        }
        return this.grid[y][x];
    }

    /**
     * Validates if the given coordinates are within the grid boundaries.
     * @param x The grid x-coordinate.
     * @param y The grid y-coordinate.
     * @returns True if the coordinates are valid, false otherwise.
     */
    public isValidCell(x: number, y: number): boolean {
        return x >= 0 && x < this.dimensions.cols && y >= 0 && y < this.dimensions.rows;
    }

    /**
     * Attempts to make a move at the given coordinates.
     * @param x The grid x-coordinate.
     * @param y The grid y-coordinate.
     * @returns An object indicating success and any win result.
     */
    public makeMove(x: number, y: number): { success: boolean, win: WinResult | null } {
        if (this.gameOver || !this.isValidCell(x, y) || this.grid[y][x] !== '') {
            return { success: false, win: null };
        }

        const player = this.currentPlayer;
        this.grid[y][x] = player;
        this.moveHistory.push({ x, y, player });

        const winResult = this.checkWin(x, y, player);
        if (winResult) {
            this.gameOver = true;
        } else {
            this.togglePlayer();
        }

        return { success: true, win: winResult };
    }

    /**
     * Checks if there are any moves to undo.
     * @returns True if at least one move has been made, false otherwise.
     */
    public canUndo(): boolean {
        return this.moveHistory.length > 0;
    }

    /**
     * Returns the number of moves made so far.
     * @returns The number of moves in the history.
     */
    public getMoveCount(): number {
        return this.moveHistory.length;
    }

    /**
     * Undoes the last move, restoring the previous game state.
     * @returns The coordinates of the undone move, or null if no move to undo.
     */
    public undoLastMove(): { x: number, y: number } | null {
        if (this.moveHistory.length === 0) {
            return null;
        }

        const lastMove = this.moveHistory.pop()!;
        this.grid[lastMove.y][lastMove.x] = '';
        this.currentPlayer = lastMove.player;
        this.gameOver = false;

        return { x: lastMove.x, y: lastMove.y };
    }

    /**
     * Switches the current player from 'X' to 'O' or vice versa.
     */
    private togglePlayer(): void {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    /**
     * Checks if the last move resulted in a win.
     * @param x The x-coordinate of the last move.
     * @param y The y-coordinate of the last move.
     * @param player The player who made the last move.
     * @returns A WinResult object if there is a win, null otherwise.
     */
    private checkWin(x: number, y: number, player: Player): WinResult | null {
        for (const [dx, dy] of GameLogic.WIN_CHECK_DIRECTIONS) {
            const positive = this.countConsecutive(x, y, dx, dy, player);
            const negative = this.countConsecutive(x, y, -dx, -dy, player);

            if (1 + positive.count + negative.count >= this.dimensions.winSequence) {
                return {
                    player: player,
                    start: { x: negative.endX, y: negative.endY },
                    end: { x: positive.endX, y: positive.endY }
                };
            }
        }
        return null;
    }

    /**
     * Counts consecutive matching symbols in a specific direction.
     * @param x Starting x-coordinate.
     * @param y Starting y-coordinate.
     * @param dx X direction increment.
     * @param dy Y direction increment.
     * @param player The player symbol to match.
     * @returns Object containing the count of consecutive symbols and the end coordinates.
     */
    private countConsecutive(x: number, y: number, dx: number, dy: number, player: Player): { count: number, endX: number, endY: number } {
        let count = 0;
        let i = 1;
        let endX = x;
        let endY = y;
        while (true) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (!this.isValidCell(nx, ny) || this.grid[ny][nx] !== player) break;
            endX = nx;
            endY = ny;
            count++;
            i++;
        }
        return { count, endX, endY };
    }
}
