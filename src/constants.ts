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
 * Dark mode color palette.
 */
const DARK_COLORS = {
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
 * Light mode color palette.
 */
const LIGHT_COLORS = {
    GAME_BG: '#e0e0e0',
    PLAYER_X: '#cc8800',
    PLAYER_O: '#0088cc',
    WIN: '#00aa00',
    UI_BG: '#ffffff',
    BUTTON_BG: '#cccccc',
    BUTTON_HOVER: '#aaaaaa',
    BUTTON_TEXT: '#333333',
    GRID: '#333333',
};

/**
 * Tracks the current theme state.
 */
let _isDarkMode = true;

/**
 * Returns whether dark mode is currently active.
 */
export const isDarkMode = () => _isDarkMode;

/**
 * Updates the ColorConfig with values from the given palette.
 */
const updateColorConfig = (palette: typeof DARK_COLORS) => {
    ColorConfig.GAME_BG_STR = palette.GAME_BG;
    ColorConfig.PLAYER_X_STR = palette.PLAYER_X;
    ColorConfig.PLAYER_O_STR = palette.PLAYER_O;
    ColorConfig.WIN_STR = palette.WIN;
    ColorConfig.UI_BG_STR = palette.UI_BG;
    ColorConfig.BUTTON_BG_STR = palette.BUTTON_BG;
    ColorConfig.BUTTON_HOVER_STR = palette.BUTTON_HOVER;
    ColorConfig.BUTTON_TEXT_STR = palette.BUTTON_TEXT;
    ColorConfig.GRID_STR = palette.GRID;

    ColorConfig.GAME_BG = parseColor(palette.GAME_BG);
    ColorConfig.PLAYER_X = parseColor(palette.PLAYER_X);
    ColorConfig.PLAYER_O = parseColor(palette.PLAYER_O);
    ColorConfig.WIN = parseColor(palette.WIN);
    ColorConfig.UI_BG = parseColor(palette.UI_BG);
    ColorConfig.BUTTON_BG = parseColor(palette.BUTTON_BG);
    ColorConfig.BUTTON_HOVER = parseColor(palette.BUTTON_HOVER);
    ColorConfig.BUTTON_TEXT = parseColor(palette.BUTTON_TEXT);
    ColorConfig.GRID = parseColor(palette.GRID);
};

/**
 * Initializes the theme based on system preference.
 * Should be called once at application startup.
 */
export const initTheme = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        _isDarkMode = false;
        updateColorConfig(LIGHT_COLORS);
    } else {
        _isDarkMode = true;
        updateColorConfig(DARK_COLORS);
    }
};

/**
 * Toggles between dark and light mode, updating ColorConfig accordingly.
 */
export const toggleTheme = () => {
    _isDarkMode = !_isDarkMode;
    updateColorConfig(_isDarkMode ? DARK_COLORS : LIGHT_COLORS);
};

/**
 * Exported color configuration, providing both string and hex number formats.
 * This object is mutable and updated by initTheme() and toggleTheme().
 */
export const ColorConfig = {
    GAME_BG_STR: DARK_COLORS.GAME_BG,
    PLAYER_X_STR: DARK_COLORS.PLAYER_X,
    PLAYER_O_STR: DARK_COLORS.PLAYER_O,
    WIN_STR: DARK_COLORS.WIN,
    UI_BG_STR: DARK_COLORS.UI_BG,
    BUTTON_BG_STR: DARK_COLORS.BUTTON_BG,
    BUTTON_HOVER_STR: DARK_COLORS.BUTTON_HOVER,
    BUTTON_TEXT_STR: DARK_COLORS.BUTTON_TEXT,
    GRID_STR: DARK_COLORS.GRID,

    GAME_BG: parseColor(DARK_COLORS.GAME_BG),
    PLAYER_X: parseColor(DARK_COLORS.PLAYER_X),
    PLAYER_O: parseColor(DARK_COLORS.PLAYER_O),
    WIN: parseColor(DARK_COLORS.WIN),
    UI_BG: parseColor(DARK_COLORS.UI_BG),
    BUTTON_BG: parseColor(DARK_COLORS.BUTTON_BG),
    BUTTON_HOVER: parseColor(DARK_COLORS.BUTTON_HOVER),
    BUTTON_TEXT: parseColor(DARK_COLORS.BUTTON_TEXT),
    GRID: parseColor(DARK_COLORS.GRID)
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
