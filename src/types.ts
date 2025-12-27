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
 * Represents the result of a winning condition check.
 * Contains the winner, and the start and end coordinates of the winning line.
 */
export interface WinResult {
    player: Player;
    start: { x: number, y: number };
    end: { x: number, y: number };
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
