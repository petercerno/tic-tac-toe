# Tic-Tac-Toe (5-in-a-row)

A modern Tic-Tac-Toe game where the goal is to get 5 in a row. Built with Phaser 3, TypeScript, Vite, Node.js, Express, and Socket.IO for real-time multiplayer.

## Features

*   **5-in-a-row Victory Condition**: Traditional Xs and Os, but you need 5 contiguous symbols to win.
*   **Fixed 30x30 Grid**: A dedicated battlefield for your strategic 5-in-a-row moves.
*   **Real-Time Multiplayer**: Connect to rooms and play with friends via WebSocket synchronization.
*   **Dark/Light Theme Toggle**: Switch between dark and light modes with a single click. Defaults to your system preference.
*   **Zoom Controls**: Zoom in/out using buttons or keyboard shortcuts.
*   **Undo Move**: Take back your last move with the undo button.
*   **Interactive UI**: Responsive camera controls with drag-to-pan and scroll support.
*   **Keyboard Shortcuts**:
    *   `R` - Restart the game
    *   `Backspace` - Undo the last move
    *   `+` / `-` - Zoom in / out
*   **Modern Stack**: Fast development and building with Vite.

## Project Structure

```
tic-tac-toe/
├── client/          # Phaser 3 game (frontend)
│   ├── index.html   # HTML entry point
│   ├── src/
│   │   ├── main.ts           # Game entry point
│   │   ├── constants.ts      # Configuration and theming
│   │   ├── types.ts          # TypeScript type definitions
│   │   ├── logic/            # Pure game logic (GameLogic.ts)
│   │   ├── scenes/           # Phaser scenes (GameScene.ts)
│   │   ├── ui/               # UI components (GameHUD.ts, RoomModal.ts)
│   │   └── multiplayer/      # WebSocket client (MultiplayerManager.ts)
│   └── dist/        # Production build output
├── server/          # Node.js Express + Socket.IO backend
│   ├── src/
│   │   ├── index.ts          # Server entry point
│   │   └── GameRoomManager.ts # Socket.IO room management
│   └── dist/        # Compiled server output
├── shared/          # Shared types and constants
│   ├── types.ts     # Socket event types and payloads
│   └── constants.ts # Room validation constants
└── package.json     # Root package with all scripts
```

## Tech Stack

### Frontend
*   [Phaser 3](https://phaser.io/) - HTML5 Game Framework
*   [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
*   [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
*   [Socket.IO Client](https://socket.io/) - Real-Time Communication

### Backend
*   [Node.js](https://nodejs.org/) - JavaScript Runtime
*   [Express 5](https://expressjs.com/) - Web Framework
*   [Socket.IO](https://socket.io/) - WebSocket Server for Multiplayer

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd tic-tac-toe
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

### Development

Start the Vite development server with hot-reload:

```bash
npm run dev
```

To run the backend server in watch mode alongside the frontend:

```bash
npm run dev:all
```

### Production

Build and start the production server:

```bash
npm run start
```

This builds the client, compiles the server, and starts the Express server serving the static files.

### Multiplayer

1.  Click the connect button (⚡) in the game HUD
2.  Enter a room name to create or join a room
3.  Share the room name with a friend to play together
4.  Maximum 2 players per room

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server for frontend only |
| `npm run dev:all` | Run frontend and backend concurrently |
| `npm run start` | Build and start production server |
