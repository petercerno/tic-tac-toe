import Phaser from 'phaser';
import { ColorConfig, GridConfig, UIConfig } from '../constants';
import type { Player, WinResult } from '../types';

export class GameHUD {
    private scene: Phaser.Scene;
    private uiBackground!: Phaser.GameObjects.Graphics;
    private statusText!: Phaser.GameObjects.Text;
    private restartButtonContainer!: Phaser.GameObjects.Container;
    private onRestart: () => void;

    /**
     * Initializes the Game HUD.
     * @param scene The Phaser scene to add UI elements to.
     * @param onRestart Callback function to execute when restart is clicked.
     */
    constructor(scene: Phaser.Scene, onRestart: () => void) {
        this.scene = scene;
        this.onRestart = onRestart;
        this.create();
    }

    /**
     * Creates all UI elements.
     */
    private create() {
        this.createUIBackground();
        this.createStatusText();
        this.createRestartButton();
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
        // Default to Player X initially, updateTurn will handle the rest
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
     * Creates the interactive restart button.
     */
    private createRestartButton() {
        const buttonWidth = UIConfig.BUTTON_WIDTH;
        const buttonHeight = UIConfig.BUTTON_HEIGHT;

        // Initial position, will be updated by resize
        const x = this.scene.scale.width - buttonWidth - UIConfig.BUTTON_MARGIN_RIGHT;
        const y = (GridConfig.UI_HEIGHT - buttonHeight) / 2;

        this.restartButtonContainer = this.scene.add.container(x, y);
        this.restartButtonContainer.setScrollFactor(0);
        this.restartButtonContainer.setDepth(2);

        const background = this.scene.add.graphics();
        background.fillStyle(ColorConfig.BUTTON_BG, 1);
        background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);

        // Add hit area for interaction
        const hitArea = new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight);
        this.restartButtonContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, 'Restart', {
            fontSize: UIConfig.BUTTON_TEXT_FONT_SIZE,
            color: ColorConfig.BUTTON_TEXT_STR
        });
        text.setOrigin(0.5);

        this.restartButtonContainer.add([background, text]);

        this.restartButtonContainer.on('pointerdown', () => {
            this.onRestart();
        });

        this.restartButtonContainer.on('pointerover', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_HOVER, 1);
            background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('pointer');
        });

        this.restartButtonContainer.on('pointerout', () => {
            background.clear();
            background.fillStyle(ColorConfig.BUTTON_BG, 1);
            background.fillRoundedRect(0, 0, buttonWidth, buttonHeight, UIConfig.BUTTON_BORDER_RADIUS);
            this.scene.input.setDefaultCursor('default');
        });
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
    }
}
