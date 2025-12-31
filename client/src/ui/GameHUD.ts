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
    panel: 'top' | 'bottom';
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
    private uiBackgroundTop!: Phaser.GameObjects.Graphics;
    private uiBackgroundBottom!: Phaser.GameObjects.Graphics;
    private statusIndicator!: Phaser.GameObjects.Container;
    private connectionText!: Phaser.GameObjects.Text;
    private buttons: Map<string, Phaser.GameObjects.Container> = new Map();
    private buttonConfigs: ButtonConfig[] = [];
    private isConnected: boolean = false;
    private playerCount: number = 0;

    // Y position for small buttons (top panel)
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
     * Top panel buttons (right to left): Restart, Connect.
     * Bottom panel buttons (centered): Back, Zoom Out, Zoom In, Theme.
     */
    private initButtonConfigs() {
        const { BUTTON_MARGIN_RIGHT, SMALL_BUTTON_SIZE, SMALL_BUTTON_GAP } = UIConfig;

        const btnSize = SMALL_BUTTON_SIZE;
        const gap = SMALL_BUTTON_GAP;
        const margin = BUTTON_MARGIN_RIGHT;

        // Top panel: Calculate cumulative offsets from right edge (right to left layout)
        const restartOffset = btnSize + margin;
        const connectOffset = restartOffset + gap + btnSize;

        // Bottom panel: 4 buttons centered horizontally
        // Layout: [back] [margin] [zoomOut] [gap] [zoomIn] [margin] [theme]
        // Zoom buttons grouped together, with larger margins separating from other buttons
        const bottomTotalWidth = 4 * btnSize + gap + 2 * margin;
        // getX returns the left edge of each button, calculated from center
        const getBottomButtonX = (w: number, index: number) => {
            const startX = (w - bottomTotalWidth) / 2;
            // Offsets: back, zoomOut, zoomIn, theme
            const offsets = [
                0,
                btnSize + margin,
                btnSize + margin + btnSize + gap,
                btnSize + margin + btnSize + gap + btnSize + margin
            ];
            return startX + offsets[index];
        };

        this.buttonConfigs = [
            // Top panel buttons
            {
                id: 'restart',
                label: '⏻',
                onClick: () => this.callbacks.onRestart(),
                getX: (w: number) => w - restartOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'top'
            },
            {
                id: 'connect',
                label: () => this.isConnected ? '⊘' : '⚡︎',
                onClick: () => this.isConnected ? this.callbacks.onDisconnect() : this.callbacks.onConnect(),
                getX: (w: number) => w - connectOffset,
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'top'
            },
            // Bottom panel buttons (centered, left to right: back, zoom out, zoom in, theme)
            {
                id: 'back',
                label: '↺',
                onClick: () => this.callbacks.onUndo(),
                getX: (w: number) => getBottomButtonX(w, 0),
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'bottom'
            },
            {
                id: 'zoomOut',
                label: '-',
                onClick: () => this.callbacks.onZoom(-GameConfig.ZOOM_STEP),
                getX: (w: number) => getBottomButtonX(w, 1),
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'bottom'
            },
            {
                id: 'zoomIn',
                label: '+',
                onClick: () => this.callbacks.onZoom(GameConfig.ZOOM_STEP),
                getX: (w: number) => getBottomButtonX(w, 2),
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'bottom'
            },
            {
                id: 'theme',
                label: () => isDarkMode() ? '☼' : '☾',
                onClick: () => this.callbacks.onToggleTheme(),
                getX: (w: number) => getBottomButtonX(w, 3),
                width: SMALL_BUTTON_SIZE,
                height: SMALL_BUTTON_SIZE,
                panel: 'bottom'
            }
        ];
    }

    /**
     * Creates all UI elements.
     */
    private create() {
        this.createUIBackgroundTop();
        this.createUIBackgroundBottom();
        this.createStatusIndicator();
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
            this.uiBackgroundTop,
            this.uiBackgroundBottom,
            this.statusIndicator,
            this.connectionText,
            ...this.buttons.values()
        ];
    }

    /**
     * Updates the status indicator to show which player's turn it is.
     * @param currentPlayer The symbol of the current player.
     */
    public updateTurn(currentPlayer: Player) {
        const text = this.statusIndicator.getData('text') as Phaser.GameObjects.Text;

        text.setText(currentPlayer);
        text.setColor(currentPlayer === 'X' ? ColorConfig.PLAYER_X_STR : ColorConfig.PLAYER_O_STR);

        this.redrawStatusBackground();
    }

    /**
     * Displays the win indicator.
     * @param winResult The result of the game.
     */
    public showWin(winResult: WinResult) {
        const text = this.statusIndicator.getData('text') as Phaser.GameObjects.Text;

        text.setText(winResult.player);
        text.setColor(ColorConfig.WIN_STR);

        this.redrawStatusBackground();
    }

    /**
     * Redraws the status indicator background with current theme colors.
     */
    private redrawStatusBackground() {
        const background = this.statusIndicator.getData('background') as Phaser.GameObjects.Graphics;
        const radius = UIConfig.SMALL_BUTTON_SIZE / 2;

        background.clear();
        background.fillStyle(ColorConfig.BUTTON_BG, 1);
        background.fillCircle(radius, radius, radius);
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
            this.playerCount = roomInfo.playerCount;
            this.connectionText.setText(roomInfo.roomName);
            // Gray for 1 player, green for 2 players
            this.connectionText.setColor(roomInfo.playerCount === 2 ? ColorConfig.WIN_STR : '#888888');
        } else {
            this.playerCount = 0;
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
        const height = this.scene.scale.height;
        // Top panel
        this.uiBackgroundTop.clear();
        this.uiBackgroundTop.fillStyle(ColorConfig.UI_BG, UIConfig.UI_BG_ALPHA);
        this.uiBackgroundTop.fillRect(0, 0, width, GridConfig.UI_HEIGHT);
        // Bottom panel
        this.uiBackgroundBottom.clear();
        this.uiBackgroundBottom.fillStyle(ColorConfig.UI_BG, UIConfig.UI_BG_ALPHA);
        this.uiBackgroundBottom.fillRect(0, height - GridConfig.UI_HEIGHT, width, GridConfig.UI_HEIGHT);
    }

    // ==================== Private UI Creation ====================

    /**
     * Creates the background graphics for the top UI panel.
     */
    private createUIBackgroundTop() {
        this.uiBackgroundTop = this.scene.add.graphics();
        this.uiBackgroundTop.setScrollFactor(0);
        this.uiBackgroundTop.setDepth(1); // Above grid
    }

    /**
     * Creates the background graphics for the bottom UI panel.
     */
    private createUIBackgroundBottom() {
        this.uiBackgroundBottom = this.scene.add.graphics();
        this.uiBackgroundBottom.setScrollFactor(0);
        this.uiBackgroundBottom.setDepth(1); // Above grid
        this.updateUIBackground();
    }

    /**
     * Creates the status indicator showing the current player's symbol.
     */
    private createStatusIndicator() {
        const size = UIConfig.SMALL_BUTTON_SIZE;
        const radius = size / 2;
        const x = UIConfig.BUTTON_MARGIN_RIGHT;
        const y = this.smallButtonY;

        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(2);

        const background = this.scene.add.graphics();
        background.fillStyle(ColorConfig.BUTTON_BG, 1);
        background.fillCircle(radius, radius, radius);

        const text = this.scene.add.text(radius, radius, 'X', {
            fontSize: UIConfig.BUTTON_TEXT_FONT_SIZE,
            color: ColorConfig.PLAYER_X_STR
        });
        text.setOrigin(0.5);

        container.add([background, text]);
        container.setData('background', background);
        container.setData('text', text);

        this.statusIndicator = container;
    }

    /**
     * Creates the text object displaying the connection status.
     */
    private createConnectionText() {
        const screenWidth = this.scene.scale.width;
        this.connectionText = this.scene.add.text(
            screenWidth / 2,
            GridConfig.UI_HEIGHT / 2,
            '',
            { fontSize: '14px', color: ColorConfig.WIN_STR }
        );
        this.connectionText.setOrigin(0.5, 0.5); // Center both horizontally and vertically
        this.connectionText.setScrollFactor(0);
        this.connectionText.setDepth(2);
    }

    /**
     * Creates all buttons from the button configurations.
     */
    private createAllButtons() {
        const screenWidth = this.scene.scale.width;
        const screenHeight = this.scene.scale.height;

        for (const config of this.buttonConfigs) {
            const x = config.getX(screenWidth);
            const y = config.panel === 'top'
                ? this.smallButtonY
                : screenHeight - GridConfig.UI_HEIGHT + this.smallButtonY;
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

        // Update status indicator background
        this.redrawStatusBackground();

        // Update connection text color for theme
        if (this.isConnected && this.playerCount === 2) {
            this.connectionText.setColor(ColorConfig.WIN_STR);
        }

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
     * @param height The new height of the game canvas.
     */
    public handleResize(width: number, height: number) {
        this.updateUIBackground();

        // Update connection text position (centered horizontally)
        this.connectionText.x = width / 2;

        // Update all button positions from configs
        for (const config of this.buttonConfigs) {
            const container = this.buttons.get(config.id);
            if (container) {
                container.x = config.getX(width);
                container.y = config.panel === 'top'
                    ? this.smallButtonY
                    : height - GridConfig.UI_HEIGHT + this.smallButtonY;
            }
        }
    }
}
