import Phaser from 'phaser';
import { ColorConfig, GridConfig, UIConfig, isDarkMode } from '../constants';
import type { Player, WinResult } from '../types';

/**
 * Manages the Head-Up Display (HUD) for the game.
 * Displays the current player turn, win status, and interactive buttons
 * for restarting the game and toggling the theme.
 * All UI elements are fixed to the viewport and respond to window resizing.
 */
export class GameHUD {
    private scene: Phaser.Scene;
    private uiBackground!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private restartButtonContainer!: Phaser.GameObjects.Container;
    private themeButtonContainer!: Phaser.GameObjects.Container;
    private onRestart: () => void;
    private onToggleTheme: () => void;

    /**
     * Initializes the Game HUD.
     * @param scene The Phaser scene to add UI elements to.
     * @param onRestart Callback function to execute when restart is clicked.
     * @param onToggleTheme Callback function to execute when theme toggle is clicked.
     */
    constructor(scene: Phaser.Scene, onRestart: () => void, onToggleTheme: () => void) {
        this.scene = scene;
        this.onRestart = onRestart;
        this.onToggleTheme = onToggleTheme;
        this.create();
    }

    /**
     * Creates all UI elements.
     */
    private create() {
        this.createUIBackground();
        this.createStatusText();
        this.createRestartButton();
        this.createThemeButton();
    }

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
     * Creates an interactive button with standard styling and hover effects.
     * @param x The x position of the button.
     * @param y The y position of the button.
     * @param label The text label for the button.
     * @param onClick Callback function when button is clicked.
     * @returns The button container.
     */
    private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
        const buttonWidth = UIConfig.BUTTON_WIDTH;
        const buttonHeight = UIConfig.BUTTON_HEIGHT;

        const container = this.scene.add.container(x, y);
        container.setScrollFactor(0);
        container.setDepth(2);

        const background = this.scene.add.graphics();
        background.fillStyle(ColorConfig.BUTTON_BG, 1);
        background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);

        const hitArea = new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, label, {
            fontSize: UIConfig.BUTTON_TEXT_FONT_SIZE,
            color: ColorConfig.BUTTON_TEXT_STR
        });
        text.setOrigin(0.5);

        container.add([background, text]);
        container.setData('background', background);
        container.setData('text', text);

        container.on('pointerdown', onClick);

        container.on('pointerover', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_HOVER, 1);
            background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('pointer');
        });

        container.on('pointerout', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_BG, 1);
            background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('default');
        });

        return container;
    }

    /**
     * Creates the interactive restart button.
     */
    private createRestartButton() {
        const x = this.scene.scale.width - UIConfig.BUTTON_WIDTH - UIConfig.BUTTON_MARGIN_RIGHT;
        const y = (GridConfig.UI_HEIGHT - UIConfig.BUTTON_HEIGHT) / 2;
        this.restartButtonContainer = this.createButton(x, y, 'Restart', () => this.onRestart());
    }

    /**
     * Creates the interactive theme toggle button.
     */
    private createThemeButton() {
        const x = this.scene.scale.width - (UIConfig.BUTTON_WIDTH * 2) - (UIConfig.BUTTON_MARGIN_RIGHT * 2);
        const y = (GridConfig.UI_HEIGHT - UIConfig.BUTTON_HEIGHT) / 2;
        const label = isDarkMode() ? '☀️ Light' : '🌙 Dark';
        this.themeButtonContainer = this.createButton(x, y, label, () => this.onToggleTheme());
    }

    /**
     * Refreshes all HUD elements to reflect the current theme colors.
     * Called after theme toggle to update UI without recreating elements.
     */
    public refresh() {
        this.updateUIBackground();

        // Update both button containers
        [this.restartButtonContainer, this.themeButtonContainer].forEach(container => {
            if (container) {
                const background = container.getData('background') as Phaser.GameObjects.Graphics;
                const text = container.getData('text') as Phaser.GameObjects.Text;

                if (background) {
                    background.clear();
                    background.fillStyle(ColorConfig.BUTTON_BG, 1);
                    background.fillRoundedRect(0, 0, UIConfig.BUTTON_WIDTH, UIConfig.BUTTON_HEIGHT, UIConfig.BUTTON_BORDER_RADIUS);
                }

                if (text) {
                    text.setColor(ColorConfig.BUTTON_TEXT_STR);
                }
            }
        });

        // Update theme button text to show correct icon/label
        const themeText = this.themeButtonContainer.getData('text') as Phaser.GameObjects.Text;
        if (themeText) {
            themeText.setText(isDarkMode() ? '☀️ Light' : '🌙 Dark');
        }
    }

    /**
     * Handles window resize events to update the UI and button positions.
     * @param width The new width of the game canvas.
     */
    public handleResize(width: number) {
        this.updateUIBackground();
        if (this.restartButtonContainer) {
            this.restartButtonContainer.x = width - UIConfig.BUTTON_WIDTH - UIConfig.BUTTON_MARGIN_RIGHT;
        }
        if (this.themeButtonContainer) {
            this.themeButtonContainer.x = width - (UIConfig.BUTTON_WIDTH * 2) - (UIConfig.BUTTON_MARGIN_RIGHT * 2);
        }
    }
}
