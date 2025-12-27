/**
 * Configuration for the game grid layout and dimensions.
 */
export const GridConfig = {
    GRID_SIZE: 30,
    CELL_SIZE: 40,
    MARGIN: 50,
    UI_HEIGHT: 70,
    get TOP_MARGIN() { return this.MARGIN + this.UI_HEIGHT; },
    get CANVAS_WIDTH() { return this.MARGIN * 2 + this.GRID_SIZE * this.CELL_SIZE; },
    get CANVAS_HEIGHT() { return this.MARGIN + this.TOP_MARGIN + this.GRID_SIZE * this.CELL_SIZE; }
};

/**
 * Helper to parse a hex string (e.g., '#ffffff') into a number (e.g., 0xffffff).
 */
const parseColor = (color: string) => parseInt(color.replace('#', '0x'), 16);

/**
 * Internal color palette definitions.
 */
const COLORS = {
    GAME_BG: '#333333',
    PLAYER_X: '#ffff00',
    PLAYER_O: '#00ffff',
    WIN: '#00ff00',
    UI_BG: '#000000',
    BUTTON_BG: '#444444',
    BUTTON_HOVER: '#666666',
    BUTTON_TEXT: '#ffffff',
    GRID: '#ffffff',
};

/**
 * Exported color configuration, providing both string and hex number formats.
 */
export const ColorConfig = {
    GAME_BG_STR: COLORS.GAME_BG,
    PLAYER_X_STR: COLORS.PLAYER_X,
    PLAYER_O_STR: COLORS.PLAYER_O,
    WIN_STR: COLORS.WIN,
    UI_BG_STR: COLORS.UI_BG,
    BUTTON_BG_STR: COLORS.BUTTON_BG,
    BUTTON_HOVER_STR: COLORS.BUTTON_HOVER,
    BUTTON_TEXT_STR: COLORS.BUTTON_TEXT,
    GRID_STR: COLORS.GRID,

    GAME_BG: parseColor(COLORS.GAME_BG),
    PLAYER_X: parseColor(COLORS.PLAYER_X),
    PLAYER_O: parseColor(COLORS.PLAYER_O),
    WIN: parseColor(COLORS.WIN),
    UI_BG: parseColor(COLORS.UI_BG),
    BUTTON_BG: parseColor(COLORS.BUTTON_BG),
    BUTTON_HOVER: parseColor(COLORS.BUTTON_HOVER),
    BUTTON_TEXT: parseColor(COLORS.BUTTON_TEXT),
    GRID: parseColor(COLORS.GRID)
};

/**
 * General game rules and settings.
 */
export const GameConfig = {
    DRAG_THRESHOLD: 10,
    WIN_CONDITION_COUNT: 5
};

/**
 * Configuration for UI elements like text and buttons.
 */
export const UIConfig = {
    UI_BG_ALPHA: 0.5,
    STATUS_TEXT_OFFSET_X: 10,
    STATUS_TEXT_FONT_SIZE: '20px',
    BUTTON_WIDTH: 100,
    BUTTON_HEIGHT: 35,
    BUTTON_MARGIN_RIGHT: 20,
    BUTTON_BORDER_RADIUS: 8,
    BUTTON_TEXT_FONT_SIZE: '16px'
};

/**
 * Configuration for graphics rendering, including line widths and sizes.
 */
export const GraphicsConfig = {
    GRID_LINE_WIDTH: 2,
    SYMBOL_LINE_WIDTH: 3,
    SYMBOL_X_SIZE: 10,
    SYMBOL_O_RADIUS: 12,
    WIN_LINE_THICKNESS: 20,
    WIN_LINE_ALPHA: 0.5,
    GRID_ALPHA: 0.5
};
