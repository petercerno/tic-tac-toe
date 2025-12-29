/**
 * Represents a position on the game grid (cell indices).
 * Values are integers representing row/column indices.
 */
export interface GridPosition {
    x: number;
    y: number;
}

/**
 * Represents a position in world/pixel coordinates.
 * Values are floating-point numbers representing screen positions.
 */
export interface WorldPosition {
    x: number;
    y: number;
}

/**
 * Represents the two possible players in the game: 'X' or 'O'.
 */
export type Player = 'X' | 'O';

/**
 * Represents the content of a single cell on the grid.
 * Can be a player's symbol ('X' or 'O') or an empty string for an unoccupied cell.
 */
export type Cell = Player | '';

/**
 * Represents a single move in the game history.
 */
export interface Move {
    position: GridPosition;
    player: Player;
}

/**
 * Represents the result of a winning condition check.
 * Contains the winner, and the start and end coordinates of the winning line.
 */
export interface WinResult {
    player: Player;
    start: GridPosition;
    end: GridPosition;
}

/**
 * Defines the dimensions and rules for the game grid.
 */
export interface GridDimensions {
    /** Number of rows in the grid. */
    rows: number;
    /** Number of columns in the grid. */
    cols: number;
    /** Number of consecutive symbols required to win. */
    winSequence: number;
}
