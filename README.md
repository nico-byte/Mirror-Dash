# Multiplayer Game with Phaser and Socket.io

This project is a multiplayer browser game built with Phaser 3 and Socket.io. It allows players to create lobbies, join each other's games, and play together in real-time.

## Project Structure

The project is divided into two main parts:

-   `client`: The frontend application built with Phaser and Vite
-   `server`: The backend Node.js server using Socket.io

## Setup and Installation

1. Clone the repository
2. Install dependencies for both client and server:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create a `.env` file in the client directory by copying the `.env.example`:

```bash
cd client
cp .env.example .env
```

## Running the Development Environment

To run both the client and server concurrently:

```bash
# From the root directory
make dev
```

Or run them separately:

```bash
# Run the client
cd client
npm run dev

# Run the server
cd server
npm run nodemon
```

The client will be available at http://localhost:8080 and the server at http://localhost:9000.

## Advanced Development Mode

The game includes an advanced development mode with various options that can be configured through environment variables in the `.env` file.

### Environment Variables

| Variable                   | Description                                             | Default Value           |
| -------------------------- | ------------------------------------------------------- | ----------------------- |
| `VITE_SERVER_URL`          | URL of the Socket.io server                             | `http://localhost:9000` |
| `VITE_START_DIRECTLY`      | Skip the preloader and go directly to the next scene    | `false`                 |
| `VITE_SKIP_MENU`           | Skip the main menu and go directly to the lobby or game | `false`                 |
| `VITE_SKIP_LOBBY`          | Skip the lobby and go directly to the game              | `false`                 |
| `VITE_DIRECT_CONNECT`      | Directly connect to a specific lobby by ID              | empty                   |
| `VITE_DEBUG_MODE`          | Enable debug information display                        | `false`                 |
| `VITE_DEFAULT_PLAYER_NAME` | Set a default player name                               | `Player_Dev`            |

### Common Development Configurations

#### Quick Testing Mode

To test the game quickly without going through menu screens:

```
VITE_SKIP_MENU=true
VITE_SKIP_LOBBY=true
VITE_DEBUG_MODE=true
```

#### Multiplayer Testing (2 browsers)

To test multiplayer functionality with two browser windows:

1. In the first window, use normal mode and create a lobby
2. Copy the lobby ID from the console logs (it will appear when the lobby is created)
3. In the second window, use direct connect mode:

```
VITE_SKIP_MENU=true
VITE_DIRECT_CONNECT=your-lobby-id-here
```

#### Debug Mode

For development with extra debug information:

```
VITE_DEBUG_MODE=true
```

This will display player coordinates and other useful debugging information.

## Building for Production

To create a production build:

```bash
# Build the client
cd client
npm run build

# The output will be in the client/dist directory
```

## Game Flow

1. **Main Menu**: Choose a player name and go to lobbies or quick play
2. **Lobby**: Create or join a game lobby
3. **Game**: Play the multiplayer game with connected players

## Troubleshooting

If you encounter connection issues:

1. Ensure the server is running
2. Check that the `VITE_SERVER_URL` in your `.env` file matches your server URL
3. Check the browser console for any errors or connection issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
