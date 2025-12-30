import { isDarkMode, MultiplayerConfig } from '../constants';

/**
 * Generates CSS styles for the room modal based on the current theme.
 * @param dark Whether dark mode is active.
 * @returns The CSS string for the modal styles.
 */
function generateModalStyles(dark: boolean): string {
    const bgColor = dark ? '#1a1a1a' : '#ffffff';
    const textColor = dark ? '#ffffff' : '#333333';
    const borderColor = dark ? '#444444' : '#cccccc';
    const inputBg = dark ? '#333333' : '#f5f5f5';
    const buttonBg = dark ? '#444444' : '#cccccc';
    const buttonHover = dark ? '#555555' : '#bbbbbb';
    const primaryColor = dark ? '#4CAF50' : '#2196F3';

    return `
        #room-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        #room-modal-container {
            background: ${bgColor};
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            min-width: 320px;
            max-width: 400px;
            animation: modalSlideIn 0.2s ease-out;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #room-modal-title {
            margin: 0 0 20px 0;
            color: ${textColor};
            font-size: 24px;
            font-weight: 600;
            text-align: center;
        }

        #room-name-input {
            width: 100%;
            padding: 12px 16px;
            font-size: 16px;
            border: 2px solid ${borderColor};
            border-radius: 8px;
            background: ${inputBg};
            color: ${textColor};
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }

        #room-name-input:focus {
            border-color: ${primaryColor};
        }

        #room-name-input::placeholder {
            color: ${dark ? '#888888' : '#999999'};
        }

        #room-modal-hint {
            margin: 8px 0 0 0;
            color: ${dark ? '#888888' : '#666666'};
            font-size: 12px;
            text-align: center;
        }

        #room-modal-error {
            margin: 8px 0 0 0;
            color: #f44336;
            font-size: 14px;
            text-align: center;
            min-height: 20px;
        }

        #room-modal-buttons {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }

        #room-modal-buttons button {
            flex: 1;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 500;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }

        #room-modal-cancel {
            background: ${buttonBg};
            color: ${textColor};
        }

        #room-modal-cancel:hover {
            background: ${buttonHover};
        }

        #room-modal-connect {
            background: ${primaryColor};
            color: #ffffff;
        }

        #room-modal-connect:hover {
            filter: brightness(1.1);
        }

        #room-modal-connect:disabled {
            background: ${dark ? '#555555' : '#cccccc'};
            color: ${dark ? '#888888' : '#999999'};
            cursor: not-allowed;
        }
    `;
}

/**
 * Callback functions for room modal interactions.
 */
export interface RoomModalCallbacks {
    /** Called when user submits a valid room name. */
    onConnect: (roomName: string) => void;
    /** Called when user cancels the modal. */
    onCancel: () => void;
}

/**
 * HTML-based modal dialog for entering room name.
 * Uses native HTML elements overlayed on the Phaser canvas for better
 * form handling and accessibility compared to Phaser-based forms.
 */
export class RoomModal {
    private overlay: HTMLDivElement | null = null;
    private callbacks: RoomModalCallbacks;

    constructor(callbacks: RoomModalCallbacks) {
        this.callbacks = callbacks;
    }

    /**
     * Shows the room name input modal.
     */
    public show(): void {
        if (this.overlay) return; // Already showing

        this.overlay = document.createElement('div');
        this.overlay.id = 'room-modal-overlay';
        this.overlay.innerHTML = this.getModalHTML();
        this.applyStyles();
        document.body.appendChild(this.overlay);

        // Focus input after a brief delay for animation
        setTimeout(() => {
            const input = document.getElementById('room-name-input') as HTMLInputElement;
            input?.focus();
        }, 100);

        this.setupEventListeners();
    }

    /**
     * Hides and destroys the modal.
     */
    public hide(): void {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        // Clean up style element
        const styleElement = document.getElementById('room-modal-styles');
        if (styleElement) {
            styleElement.remove();
        }
    }

    /**
     * Updates modal styles for theme changes.
     */
    public refresh(): void {
        if (this.overlay) {
            this.applyStyles();
        }
    }

    /**
     * Shows an error message in the modal.
     * @param message The error message to display.
     */
    public showError(message: string): void {
        const errorEl = document.getElementById('room-modal-error');
        if (errorEl) {
            errorEl.textContent = message;
        }
    }

    // ==================== Private Methods ====================

    /**
     * Returns the modal HTML structure.
     */
    private getModalHTML(): string {
        return `
            <div id="room-modal-container">
                <h2 id="room-modal-title">Connect to Room</h2>
                <input 
                    type="text" 
                    id="room-name-input" 
                    placeholder="Enter room name..."
                    maxlength="30"
                    autocomplete="off"
                    spellcheck="false"
                />
                <p id="room-modal-hint">Only letters, numbers, and hyphens allowed</p>
                <p id="room-modal-error"></p>
                <div id="room-modal-buttons">
                    <button id="room-modal-cancel">Cancel</button>
                    <button id="room-modal-connect">Connect</button>
                </div>
            </div>
        `;
    }

    /**
     * Applies CSS styles to the modal elements based on current theme.
     */
    private applyStyles(): void {
        const styles = generateModalStyles(isDarkMode());

        // Remove existing style if present
        const existingStyle = document.getElementById('room-modal-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const styleElement = document.createElement('style');
        styleElement.id = 'room-modal-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    /**
     * Sets up event listeners for modal interactions.
     */
    private setupEventListeners(): void {
        const input = document.getElementById('room-name-input') as HTMLInputElement;
        const connectBtn = document.getElementById('room-modal-connect') as HTMLButtonElement;
        const cancelBtn = document.getElementById('room-modal-cancel') as HTMLButtonElement;
        const errorEl = document.getElementById('room-modal-error') as HTMLParagraphElement;

        // Validate input on change
        const validateInput = () => {
            const value = input.value.trim();
            if (value === '') {
                connectBtn.disabled = true;
                errorEl.textContent = '';
            } else if (!MultiplayerConfig.ROOM_NAME_PATTERN.test(value)) {
                connectBtn.disabled = true;
                errorEl.textContent = 'Invalid characters. Use only letters, numbers, and hyphens.';
            } else {
                connectBtn.disabled = false;
                errorEl.textContent = '';
            }
        };

        input.addEventListener('input', validateInput);
        validateInput(); // Initial state

        // Stop propagation of all keyboard events to prevent Phaser from capturing them
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !connectBtn.disabled) {
                this.handleConnect(input.value.trim());
            } else if (e.key === 'Escape') {
                this.handleCancel();
            }
        });

        input.addEventListener('keyup', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => e.stopPropagation());

        // Button handlers
        connectBtn.addEventListener('click', () => {
            if (!connectBtn.disabled) {
                this.handleConnect(input.value.trim());
            }
        });

        cancelBtn.addEventListener('click', () => {
            this.handleCancel();
        });

        // Close on overlay click
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.handleCancel();
            }
        });
    }

    /**
     * Handles the connect action.
     * @param roomName The room name to connect to.
     */
    private handleConnect(roomName: string): void {
        this.callbacks.onConnect(roomName);
    }

    /**
     * Handles the cancel action.
     */
    private handleCancel(): void {
        this.hide();
        this.callbacks.onCancel();
    }
}
