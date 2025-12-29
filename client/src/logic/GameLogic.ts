import type { GridPosition, Cell, Player, WinResult, GridDimensions } from '../types';

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
    private moveHistory: { position: GridPosition, player: Player }[] = [];

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
     * @param position The grid position (column, row).
     * @returns The cell content ('X', 'O', or ''). Returns '' if coordinates are invalid.
     */
    public getCell(position: GridPosition): Cell {
        if (!this.isValidCell(position)) {
            return '';
        }
        return this.grid[position.y][position.x];
    }

    /**
     * Validates if the given coordinates are within the grid boundaries.
     * @param position The grid position to validate.
     * @returns True if the coordinates are valid, false otherwise.
     */
    public isValidCell(position: GridPosition): boolean {
        return position.x >= 0 && position.x < this.dimensions.cols && position.y >= 0 && position.y < this.dimensions.rows;
    }

    /**
     * Attempts to make a move at the given coordinates.
     * @param position The grid position for the move.
     * @returns An object indicating success and any win result.
     */
    public makeMove(position: GridPosition): { success: boolean, win: WinResult | null } {
        if (this.gameOver || !this.isValidCell(position) || this.grid[position.y][position.x] !== '') {
            return { success: false, win: null };
        }

        const player = this.currentPlayer;
        this.grid[position.y][position.x] = player;
        this.moveHistory.push({ position, player });

        const winResult = this.checkWin(position, player);
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
    public undoLastMove(): GridPosition | null {
        if (this.moveHistory.length === 0) {
            return null;
        }

        const lastMove = this.moveHistory.pop()!;
        this.grid[lastMove.position.y][lastMove.position.x] = '';
        this.currentPlayer = lastMove.player;
        this.gameOver = false;

        return lastMove.position;
    }

    /**
     * Switches the current player from 'X' to 'O' or vice versa.
     */
    private togglePlayer(): void {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    /**
     * Checks if the last move resulted in a win.
     * @param position The grid position of the last move.
     * @param player The player who made the last move.
     * @returns A WinResult object if there is a win, null otherwise.
     */
    private checkWin(position: GridPosition, player: Player): WinResult | null {
        for (const [dx, dy] of GameLogic.WIN_CHECK_DIRECTIONS) {
            const positive = this.countConsecutive(position, dx, dy, player);
            const negative = this.countConsecutive(position, -dx, -dy, player);

            if (1 + positive.count + negative.count >= this.dimensions.winSequence) {
                return {
                    player: player,
                    start: negative.end,
                    end: positive.end
                };
            }
        }
        return null;
    }

    /**
     * Counts consecutive matching symbols in a specific direction.
     * @param start Starting grid position.
     * @param dx X direction increment.
     * @param dy Y direction increment.
     * @param player The player symbol to match.
     * @returns Object containing the count of consecutive symbols and the end grid position.
     */
    private countConsecutive(start: GridPosition, dx: number, dy: number, player: Player): { count: number, end: GridPosition } {
        let count = 0;
        let i = 1;
        let end: GridPosition = start;
        while (true) {
            const next: GridPosition = { x: start.x + dx * i, y: start.y + dy * i };
            if (!this.isValidCell(next) || this.grid[next.y][next.x] !== player) break;
            end = next;
            count++;
            i++;
        }
        return { count, end };
    }
}
