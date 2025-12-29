import Phaser from 'phaser';
import { ColorConfig, GridConfig, UIConfig, GameConfig, isDarkMode } from '../constants';
import type { Player, WinResult } from '../types';

/**
 * Callback functions for HUD interactions.
 */
export interface HUDCallbacks {
    onRestart: () => void;
    onToggleTheme: () => void;
    onZoom: (delta: number) => void;
    onUndo: () => void;
}

/**
 * Configuration for a single button including its position calculation and properties.
 */
interface ButtonConfig {
    id: string;
    label: string | (() => string);
    onClick: () => void;
    getX: (screenWidth: number) => number;
    width: number;
    height: number;
}

/**
 * Manages the Head-Up Display (HUD) for the game.
 * Displays the current player turn, win status, and interactive buttons
 * for undo, zoom controls, theme toggle, and restart.
 * All UI elements are fixed to the viewport and respond to window resizing.
 */
export class GameHUD {
    private scene: Phaser.Scene;
    private callbacks: HUDCallbacks;
    private uiBackground!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private buttons: Map<string, Phaser.GameObjects.Container> = new Map();
    private buttonConfigs: ButtonConfig[] = [];

    // Common Y positions for buttons
    private readonly buttonY = (GridConfig.UI_HEIGHT - UIConfig.BUTTON_HEIGHT) / 2;
    private readonly smallButtonY = (GridConfig.UI_HEIGHT - UIConfig.SMALL_BUTTON_SIZE) / 2;

    // ==================== Lifecycle ====================

    /**
     * Initializes the Game HUD.
     * @param scene The Phaser scene to add UI elements to.
     * @param callbacks Object containing all callback functions for HUD interactions.
     */
    constructor(scene: Phaser.Scene, callbacks: HUDCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.initButtonConfigs();
        this.create();
    }

    /**
     * Initializes the button configurations with position calculations and properties.
     * Buttons are defined from right to left: Restart, Theme, Zoom In, Zoom Out, Back.
     */
    private initButtonConfigs() {
        const { BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_MARGIN_RIGHT, SMALL_BUTTON_SIZE, SMALL_BUTTON_GAP } = UIConfig;

        // Position calculations (from right to left)
        const getRestartX = (w: number) => w - BUTTON_WIDTH - BUTTON_MARGIN_RIGHT;
        const getThemeX = (w: number) => getRestartX(w) - BUTTON_MARGIN_RIGHT - BUTTON_WIDTH;
        const getZoomInX = (w: number) => getThemeX(w) - BUTTON_MARGIN_RIGHT - SMALL_BUTTON_SIZE;
        const getZoomOutX = (w: number) => getZoomInX(w) - SMALL_BUTTON_GAP - SMALL_BUTTON_SIZE;
        const getBackX = (w: number) => getZoomOutX(w) - BUTTON_MARGIN_RIGHT - SMALL_BUTTON_SIZE;

        this.buttonConfigs = [
            {
                id: 'restart',
                label: 'Restart',
                onClick: () => this.callbacks.onRestart(),
                getX: getRestartX,
                width: BUTTON_WIDTH,
                height: BUTTON_HEIGHT
            },
            {
                id: 'theme',
                label: () => isDarkMode() ? '☀️ Light' : '🌙 Dark',
                onClick: () => this.callbacks.onToggleTheme(),
                getX: getThemeX,
                width: BUTTON_WIDTH,
                height: BUTTON_HEIGHT
            },
            {
                id: 'zoomIn',
                label: '+',
                onClick: () => this.callbacks.onZoom(GameConfig.ZOOM_STEP),
                getX: getZoomInX,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'zoomOut',
                label: '-',
                onClick: () => this.callbacks.onZoom(-GameConfig.ZOOM_STEP),
                getX: getZoomOutX,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'back',
                label: '↩',
                onClick: () => this.callbacks.onUndo(),
                getX: getBackX,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            }
        ];
    }

    /**
     * Creates all UI elements.
     */
    private create() {
        this.createUIBackground();
        this.createStatusText();
        this.createAllButtons();
    }

    // ==================== Public Methods ====================

    /**
     * Returns all HUD game objects for camera configuration.
     * @returns Array of all HUD game objects.
     */
    public getElements(): Phaser.GameObjects.GameObject[] {
        return [
            this.uiBackground,
            this.statusText,
            ...this.buttons.values()
        ];
    }

    // ==================== UI Creation ====================

    /**
     * Creates the background graphics for the UI header.
     */
    private createUIBackground() {
        this.uiBackground = this.scene.add.graphics();
        this.uiBackground.setScrollFactor(0);
        this.uiBackground.setDepth(1); // Above grid
        this.updateUIBackground();
    }

    /**
     * Updates the UI background dimensions based on the current screen size.
     */
    public updateUIBackground() {
        const width = this.scene.scale.width;
        this.uiBackground.clear();
        this.uiBackground.fillStyle(ColorConfig.UI_BG, UIConfig.UI_BG_ALPHA);
        this.uiBackground.fillRect(0, 0, width, GridConfig.UI_HEIGHT);
    }

    /**
     * Creates the text object displaying the current player's turn.
     */
    private createStatusText() {
        const initialColor = ColorConfig.PLAYER_X_STR;
        this.statusText = this.scene.add.text(
            GridConfig.MARGIN + UIConfig.STATUS_TEXT_OFFSET_X,
            GridConfig.UI_HEIGHT / 2,
            'Player X',
            { fontSize: UIConfig.STATUS_TEXT_FONT_SIZE, color: initialColor }
        );
        this.statusText.setOrigin(0, 0.5);
        this.statusText.setScrollFactor(0);
        this.statusText.setDepth(2); // Above background
    }

    /**
     * Updates the status text to show which player's turn it is.
     * @param currentPlayer The symbol of the current player.
     */
    public updateTurn(currentPlayer: Player) {
        this.statusText.setText(`Player ${currentPlayer}`);
        this.statusText.setColor(currentPlayer === 'X' ? ColorConfig.PLAYER_X_STR : ColorConfig.PLAYER_O_STR);
    }

    /**
     * Displays the win message.
     * @param winResult The result of the game.
     */
    public showWin(winResult: WinResult) {
        this.statusText.setText(`Player ${winResult.player} Wins!`);
        this.statusText.setColor(ColorConfig.WIN_STR);
    }

    /**
     * Creates all buttons from the button configurations.
     */
    private createAllButtons() {
        const screenWidth = this.scene.scale.width;

        for (const config of this.buttonConfigs) {
            const x = config.getX(screenWidth);
            const y = config.height === UIConfig.BUTTON_HEIGHT ? this.buttonY : this.smallButtonY;
            const label = typeof config.label === 'function' ? config.label() : config.label;
            const container = this.createButton(x, y, label, config.onClick, config.width, config.height);
            this.buttons.set(config.id, container);
        }
    }

    /**
     * Creates an interactive button with standard styling and hover effects.
     * @param x The x position of the button.
     * @param y The y position of the button.
     * @param label The text label for the button.
     * @param onClick Callback function when button is clicked.
     * @param width Button width.
     * @param height Button height.
     * @returns The button container.
     */
    private createButton(
        x: number,
        y: number,
        label: string,
        onClick: () => void,
        width: number,
        height: number
    ): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(2);

        const background = this.scene.add.graphics();
        background.fillStyle(ColorConfig.BUTTON_BG, 1);
        background.fillRoundedRect(0, 0, width, height, UIConfig.BUTTON_BORDER_RADIUS);

        const hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        const text = this.scene.add.text(width / 2, height / 2, label, {
            fontSize: UIConfig.BUTTON_TEXT_FONT_SIZE,
            color: ColorConfig.BUTTON_TEXT_STR
        });
        text.setOrigin(0.5);

        container.add([background, text]);
        container.setData('background', background);
        container.setData('text', text);
        container.setData('width', width);
        container.setData('height', height);

        container.on('pointerdown', onClick);

        container.on('pointerover', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_HOVER, 1);
            background.fillRoundedRect(0, 0, width, height, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('pointer');
        });

        container.on('pointerout', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_BG, 1);
            background.fillRoundedRect(0, 0, width, height, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('default');
        });

        return container;
    }

    // ==================== UI Updates ====================

    /**
     * Refreshes all HUD elements to reflect the current theme colors.
     * Called after theme toggle to update UI without recreating elements.
     */
    public refresh() {
        this.updateUIBackground();

        // Update all button containers
        for (const [id, container] of this.buttons) {
            const background = container.getData('background') as Phaser.GameObjects.Graphics;
            const text = container.getData('text') as Phaser.GameObjects.Text;
            const width = container.getData('width') as number;
            const height = container.getData('height') as number;

            background.clear();
            background.fillStyle(ColorConfig.BUTTON_BG, 1);
            background.fillRoundedRect(0, 0, width, height, UIConfig.BUTTON_BORDER_RADIUS);
            text.setColor(ColorConfig.BUTTON_TEXT_STR);

            // Update dynamic labels (e.g., theme button)
            const config = this.buttonConfigs.find(c => c.id === id);
            if (config && typeof config.label === 'function') {
                text.setText(config.label());
            }
        }
    }

    /**
     * Handles window resize events to update the UI and button positions.
     * @param width The new width of the game canvas.
     */
    public handleResize(width: number) {
        this.updateUIBackground();

        // Update all button positions from configs
        for (const config of this.buttonConfigs) {
            const container = this.buttons.get(config.id);
            if (container) {
                container.x = config.getX(width);
            }
        }
    }
}
