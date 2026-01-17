import { ROOM_NAME_REGEX, SOCKET_IO_PATH } from '@shared/constants';

/**
 * Configuration for the game grid layout and dimensions.
 */
export const GridConfig = {
    /** Number of cells in each row and column of the grid. */
    GRID_SIZE: 30,
    /** Size of each cell in pixels. */
    CELL_SIZE: 40,
    /** Horizontal margin around the grid in pixels. */
    MARGIN: 50,
    /** Height of the UI header area in pixels. */
    UI_HEIGHT: 70,
    /** Computed top margin (margin + UI height). */
    get TOP_MARGIN() { return this.MARGIN + this.UI_HEIGHT; },
    /** Computed bottom margin (margin + UI height). */
    get BOTTOM_MARGIN() { return this.MARGIN + this.UI_HEIGHT; },
    /** Computed total canvas width. */
    get CANVAS_WIDTH() { return this.MARGIN * 2 + this.GRID_SIZE * this.CELL_SIZE; },
    /** Computed total canvas height. */
    get CANVAS_HEIGHT() { return this.BOTTOM_MARGIN + this.TOP_MARGIN + this.GRID_SIZE * this.CELL_SIZE; }
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
    PLAYER_X_INTENSE: '#ffff99',
    PLAYER_O: '#00ffff',
    PLAYER_O_INTENSE: '#99ffff',
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
    PLAYER_X: '#800000',
    PLAYER_X_INTENSE: '#400000',
    PLAYER_O: '#00008b',
    PLAYER_O_INTENSE: '#000050',
    WIN: '#009900',
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
    ColorConfig.PLAYER_X_INTENSE_STR = palette.PLAYER_X_INTENSE;
    ColorConfig.PLAYER_O_STR = palette.PLAYER_O;
    ColorConfig.PLAYER_O_INTENSE_STR = palette.PLAYER_O_INTENSE;
    ColorConfig.WIN_STR = palette.WIN;
    ColorConfig.UI_BG_STR = palette.UI_BG;
    ColorConfig.BUTTON_BG_STR = palette.BUTTON_BG;
    ColorConfig.BUTTON_HOVER_STR = palette.BUTTON_HOVER;
    ColorConfig.BUTTON_TEXT_STR = palette.BUTTON_TEXT;
    ColorConfig.GRID_STR = palette.GRID;

    ColorConfig.GAME_BG = parseColor(palette.GAME_BG);
    ColorConfig.PLAYER_X = parseColor(palette.PLAYER_X);
    ColorConfig.PLAYER_X_INTENSE = parseColor(palette.PLAYER_X_INTENSE);
    ColorConfig.PLAYER_O = parseColor(palette.PLAYER_O);
    ColorConfig.PLAYER_O_INTENSE = parseColor(palette.PLAYER_O_INTENSE);
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
 * Initial values are set by initTheme() on application startup.
 */
export const ColorConfig = {
    GAME_BG_STR: '',
    PLAYER_X_STR: '',
    PLAYER_X_INTENSE_STR: '',
    PLAYER_O_STR: '',
    PLAYER_O_INTENSE_STR: '',
    WIN_STR: '',
    UI_BG_STR: '',
    BUTTON_BG_STR: '',
    BUTTON_HOVER_STR: '',
    BUTTON_TEXT_STR: '',
    GRID_STR: '',

    GAME_BG: 0,
    PLAYER_X: 0,
    PLAYER_X_INTENSE: 0,
    PLAYER_O: 0,
    PLAYER_O_INTENSE: 0,
    WIN: 0,
    UI_BG: 0,
    BUTTON_BG: 0,
    BUTTON_HOVER: 0,
    BUTTON_TEXT: 0,
    GRID: 0
};

// Initialize with default dark mode colors for type safety before initTheme() is called
updateColorConfig(DARK_COLORS);

/**
 * General game rules and settings.
 */
export const GameConfig = {
    /** Minimum pointer movement (in pixels) to consider as a drag vs a click. */
    DRAG_THRESHOLD: 10,
    /** Number of consecutive symbols required to win the game. */
    WIN_CONDITION_COUNT: 5,
    /** Minimum camera zoom level. */
    ZOOM_MIN: 0.8,
    /** Maximum camera zoom level. */
    ZOOM_MAX: 2.0,
    /** Amount to change zoom per step (button click or key press). */
    ZOOM_STEP: 0.2
};

/**
 * Configuration for UI elements like text and buttons.
 */
export const UIConfig = {
    /** Opacity of the UI header background (0 to 1). */
    UI_BG_ALPHA: 0.5,
    /** Right margin between buttons in pixels. */
    BUTTON_MARGIN_RIGHT: 20,
    /** Border radius for rounded button corners. */
    BUTTON_BORDER_RADIUS: 8,
    /** Font size for button labels. */
    BUTTON_TEXT_FONT_SIZE: '22px',
    /** Size (width and height) of all HUD buttons. */
    SMALL_BUTTON_SIZE: 35,
    /** Gap between adjacent small buttons. */
    SMALL_BUTTON_GAP: 5
};

/**
 * Configuration for graphics rendering, including line widths and sizes.
 */
export const GraphicsConfig = {
    /** Stroke width for the grid lines. */
    GRID_LINE_WIDTH: 2,
    /** Stroke width for X and O symbols. */
    SYMBOL_LINE_WIDTH: 3,
    /** Stroke width for the last-placed symbol (slightly thicker for emphasis). */
    SYMBOL_LINE_WIDTH_INTENSE: 5,
    /** Half-size of the X symbol (distance from center to line end). */
    SYMBOL_X_SIZE: 10,
    /** Radius of the O symbol circle. */
    SYMBOL_O_RADIUS: 12,
    /** Stroke width for the winning line. */
    WIN_LINE_THICKNESS: 20,
    /** Opacity of the winning line (0 to 1). */
    WIN_LINE_ALPHA: 0.5,
    /** Opacity of the grid lines (0 to 1). */
    GRID_ALPHA: 0.5
};

/**
 * Configuration for multiplayer functionality.
 */
/**
 * Determines the WebSocket server URL based on the current hostname.
 * Returns empty string for localhost (same-origin connection), Cloud Run URL otherwise.
 */
const getServerUrl = (): string => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ''; // Empty string = same origin (works for both dev and local prod)
    }
    return 'https://tic-tac-toe-428046244270.europe-west1.run.app';
};

/**
 * Configuration for multiplayer functionality.
 */
export const MultiplayerConfig = {
    /** WebSocket server URL. Uses same-origin for localhost, Cloud Run for production. */
    get SERVER_URL() { return getServerUrl(); },
    /** Socket.IO path (from shared constants). */
    SOCKET_PATH: SOCKET_IO_PATH,
    /** Pattern for valid room names (letters, numbers, and hyphens only). */
    ROOM_NAME_PATTERN: ROOM_NAME_REGEX
};
