import Phaser from 'phaser';
import { ColorConfig, GridConfig, UIConfig, GameConfig, isDarkMode } from '../constants';
import type { Player, WinResult, RoomInfo } from '../types';

/**
 * Callback functions for HUD interactions.
 */
export interface HUDCallbacks {
    onRestart: () => void;
    onToggleTheme: () => void;
    onZoom: (delta: number) => void;
    onUndo: () => void;
    onConnect: () => void;
    onDisconnect: () => void;
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
 * Displays the current player turn, win status, connection status, and interactive buttons
 * for undo, zoom controls, theme toggle, connect/disconnect, and restart.
 * All UI elements are fixed to the viewport and respond to window resizing.
 */
export class GameHUD {
    private scene: Phaser.Scene;
    private callbacks: HUDCallbacks;
    private uiBackground!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private connectionText!: Phaser.GameObjects.Text;
    private buttons: Map<string, Phaser.GameObjects.Container> = new Map();
    private buttonConfigs: ButtonConfig[] = [];
    private isConnected: boolean = false;

    // Y position for small buttons
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
     * Buttons are defined from right to left: Restart, Connect, Theme, Zoom In, Zoom Out, Back.
     */
    private initButtonConfigs() {
        const { BUTTON_MARGIN_RIGHT, SMALL_BUTTON_SIZE, SMALL_BUTTON_GAP } = UIConfig;

        // Pre-computed offsets from the right edge for each button position.
        // This avoids nested function calls during resize and improves performance.
        const btnSize = SMALL_BUTTON_SIZE;
        const gap = SMALL_BUTTON_GAP;
        const margin = BUTTON_MARGIN_RIGHT;

        // Calculate cumulative offsets from right edge (right to left layout)
        const restartOffset = btnSize + margin;
        const connectOffset = restartOffset + gap + btnSize;
        const themeOffset = connectOffset + margin + btnSize;
        const zoomInOffset = themeOffset + margin + btnSize;
        const zoomOutOffset = zoomInOffset + gap + btnSize;
        const backOffset = zoomOutOffset + margin + btnSize;

        this.buttonConfigs = [
            {
                id: 'restart',
                label: '⏻',
                onClick: () => this.callbacks.onRestart(),
                getX: (w: number) => w - restartOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'theme',
                label: () => isDarkMode() ? '☼' : '☾',
                onClick: () => this.callbacks.onToggleTheme(),
                getX: (w: number) => w - themeOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'connect',
                label: () => this.isConnected ? '⊘' : '⚡︎',
                onClick: () => this.isConnected ? this.callbacks.onDisconnect() : this.callbacks.onConnect(),
                getX: (w: number) => w - connectOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'zoomIn',
                label: '+',
                onClick: () => this.callbacks.onZoom(GameConfig.ZOOM_STEP),
                getX: (w: number) => w - zoomInOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'zoomOut',
                label: '-',
                onClick: () => this.callbacks.onZoom(-GameConfig.ZOOM_STEP),
                getX: (w: number) => w - zoomOutOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE
            },
            {
                id: 'back',
                label: '↺',
                onClick: () => this.callbacks.onUndo(),
                getX: (w: number) => w - backOffset,
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
        this.createConnectionText();
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
            this.connectionText,
            ...this.buttons.values()
        ];
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
     * Updates the connection status display.
     * @param connected Whether currently connected to a room.
     * @param roomInfo Optional room information.
     */
    public updateConnectionStatus(connected: boolean, roomInfo?: RoomInfo): void {
        this.isConnected = connected;

        // Update connection text
        if (connected && roomInfo) {
            const playerInfo = roomInfo.playerCount === 2 ? '👥' : '👤';
            this.connectionText.setText(`${playerInfo} Room: ${roomInfo.roomName}`);
            this.connectionText.setColor('#4CAF50');
        } else {
            this.connectionText.setText('');
        }

        // Update connect button label
        this.updateButtonLabel('connect');
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

    // ==================== Private UI Creation ====================

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
     * Creates the text object displaying the current player's turn.
     */
    private createStatusText() {
        const initialColor = ColorConfig.PLAYER_X_STR;
        this.statusText = this.scene.add.text(
            GridConfig.MARGIN + UIConfig.STATUS_TEXT_OFFSET_X,
            GridConfig.UI_HEIGHT / 2 - 10,
            'Player X',
            { fontSize: UIConfig.STATUS_TEXT_FONT_SIZE, color: initialColor }
        );
        this.statusText.setOrigin(0, 0.5);
        this.statusText.setScrollFactor(0);
        this.statusText.setDepth(2); // Above background
    }

    /**
     * Creates the text object displaying the connection status.
     */
    private createConnectionText() {
        this.connectionText = this.scene.add.text(
            GridConfig.MARGIN + UIConfig.STATUS_TEXT_OFFSET_X,
            GridConfig.UI_HEIGHT / 2 + 12,
            '',
            { fontSize: '14px', color: '#4CAF50' }
        );
        this.connectionText.setOrigin(0, 0.5);
        this.connectionText.setScrollFactor(0);
        this.connectionText.setDepth(2);
    }

    /**
     * Creates all buttons from the button configurations.
     */
    private createAllButtons() {
        const screenWidth = this.scene.scale.width;

        for (const config of this.buttonConfigs) {
            const x = config.getX(screenWidth);
            const label = typeof config.label === 'function' ? config.label() : config.label;
            const container = this.createButton(x, this.smallButtonY, label, config.onClick, config.width, config.height);
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

    /**
     * Updates a specific button's label.
     */
    private updateButtonLabel(buttonId: string): void {
        const container = this.buttons.get(buttonId);
        const config = this.buttonConfigs.find(c => c.id === buttonId);
        if (container && config && typeof config.label === 'function') {
            const text = container.getData('text') as Phaser.GameObjects.Text;
            text.setText(config.label());
        }
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

            // Update dynamic labels (e.g., theme button, connect button)
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
