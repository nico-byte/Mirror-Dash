# Multiplayer Split-Screen Game Developer Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Setup and Installation](#setup-and-installation)
4. [Game Concept](#game-concept)
5. [Key Components](#key-components)
6. [Split-Screen Implementation](#split-screen-implementation)
7. [Multiplayer Testing](#multiplayer-testing)
8. [Adding New Features](#adding-new-features)
9. [Common Issues and Fixes](#common-issues-and-fixes)

## Introduction

This is a multiplayer browser game built with Phaser 3 and Socket.io. It features a unique split-screen setup where each player sees their own character in the top screen and the other player in a mirrored world in the bottom screen. Players can create lobbies, join each other's games, and play together in real-time.

## Project Structure

The project is divided into two main parts:

-   `client/`: Frontend application built with Phaser and Vite

    -   `src/game/`: Core game code
        -   `main.js`: Game configuration and startup
        -   `entities/`: Game entities like Player class
        -   `scenes/`: Phaser scenes (Boot, Preloader, Menu, Lobby, Game)
    -   `public/assets`: Game assets

-   `server/`: Backend Node.js server using Socket.io
    -   `server.js`: Socket.io server for handling multiplayer functionality
    -   `package.json`: Server dependencies

## Setup and Installation

### Prerequisites

-   Node.js and npm installed
-   Git for version control

### Installation Steps

1. Clone the repository

    ```bash
    git clone [repository-url]
    cd [repository-name]
    ```

2. Install dependencies for both client and server:

    ```bash
    # Install client dependencies
    cd client
    npm install

    # Install server dependencies
    cd ../server
    npm install
    ```

3. Create a `.env` file in the client directory:
    ```bash
    cd ../client
    cp .env.example .env
    ```

### Running the Development Environment

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

## Game Concept

The game implements a unique split-screen multiplayer mechanic:

1. **Split-Screen Layout**:

    - The screen is split horizontally into two halves
    - Top half: Player's own view
    - Bottom half: Mirrored view showing the other player

2. **Mirrored Worlds**:

    - Both players see the same level layout
    - In the bottom view, everything is vertically mirrored
    - This creates a unique gameplay mechanic where you need to coordinate with the other player who is seeing a mirrored view

3. **Platformer Gameplay**:
    - Simple platformer mechanics: movement and jumping
    - Jump pads to reach higher platforms
    - Multiple platforms at different heights to navigate

## Key Components

### Client-Side Components

#### Game Scene (`Game.js`)

-   Main gameplay scene with split-screen implementation
-   Handles player input, physics, and multiplayer state synchronization
-   Creates and manages the level with platforms and jump pads
-   Sets up dual cameras for split-screen functionality

#### Player Class (`Player.js`)

-   Represents a player in the game
-   Manages player state, movement, and visuals
-   Creates separate sprites for top and bottom screen views
-   Handles mirroring of player visuals

#### Lobby System (`Lobby.js`)

-   Allows players to create and join game lobbies
-   Shows available lobbies and connected players
-   Host can start the game when enough players have joined

### Server-Side Components

#### Socket.io Server (`server.js`)

-   Manages real-time communication between clients
-   Handles lobby creation and management
-   Synchronizes player positions and actions
-   Manages game state across connected clients

## Split-Screen Implementation

The split-screen functionality is implemented without using the `setFlipY()` method (which may not be available in all Phaser versions).

### How It Works:

1. **Dual Camera Setup**:

    ```javascript
    // Set up the main camera for the top half
    this.cameras.main.setViewport(0, 0, this.scale.width, this.scale.height / 2);
    this.topCamera = this.cameras.main;

    // Create a second camera for the bottom half
    this.bottomCamera = this.cameras.add(0, midPoint, this.scale.width, midPoint);
    ```

2. **Manual Mirroring**:

    - Objects in the bottom view are positioned using the formula:

    ```javascript
    // Mirror Y position calculation
    mirrorY = screenHeight - originalY + midPoint;
    ```

3. **Camera-Specific Visibility**:

    - Each object has two versions: one for the top camera and one for the bottom
    - Each camera ignores objects meant for the other camera:

    ```javascript
    // Make top camera ignore bottom objects
    this.topCamera.ignore([bottomObject]);

    // Make bottom camera ignore top objects
    this.bottomCamera.ignore([topObject]);
    ```

### Level Creation:

The level design is duplicated with mirroring:

```javascript
// Create a platform
const platform = this.platforms.create(x, y, ...);

// Create its mirrored version for the bottom camera
const mirrorPlatform = this.add.rectangle(
    platform.x,
    screenHeight - platform.y + midPoint,
    platform.displayWidth,
    platform.displayHeight,
    platform.fillColor
);
```

## Multiplayer Testing

To test the multiplayer functionality, you'll need to connect two clients to the server.

### Option 1: Two Browser Windows (Easiest)

1. Open two browser windows pointing to your dev server (http://localhost:8080)
2. In the first window:
    - Create a lobby and note the Lobby ID (visible in debug mode or console)
3. In the second window:
    - Join the lobby using the ID from the first window
4. Start the game from the first window (host)

### Option 2: Using Environment Variables

You can use environment variables to directly connect to a specific lobby:

1. In the first window, run the game normally and create a lobby
2. Get the lobby ID from the console or debug display
3. In the second window, set the following environment variables:
    ```
    VITE_SKIP_MENU=true
    VITE_DIRECT_CONNECT=your-lobby-id-here
    ```

### Debug Mode

Enable debug mode to see player positions and lobby information:

```
VITE_DEBUG_MODE=true
```

## Adding New Features

### Adding New Level Elements

To add new platforms or obstacles:

1. Modify the `createLevel()` method in `Game.js`:

    ```javascript
    // Add a new platform
    const newPlatform = this.platforms
        .create(x, y, null)
        .setScale(width, height)
        .setSize(30, 30)
        .setDisplaySize(width * 30, height * 30)
        .setTint(color)
        .refreshBody();

    // Add its mirrored version
    const mirrorPlatform = this.add.rectangle(
        newPlatform.x,
        screenHeight - newPlatform.y + midPoint,
        newPlatform.displayWidth,
        newPlatform.displayHeight,
        newPlatform.fillColor
    );

    // Set camera visibility
    if (this.topCamera) this.topCamera.ignore(mirrorPlatform);
    if (this.bottomCamera) this.bottomCamera.ignore(newPlatform);
    ```

### Adding Power-ups

To add power-ups:

1. Create a new physics group for power-ups in `createLevel()`
2. Add collision detection in the `create()` method
3. Implement power-up effects in a new method
4. Synchronize power-up collection via Socket.io

Example:

```javascript
// Create power-up group
this.powerups = this.physics.add.group();

// Add a power-up
const powerup = this.powerups.create(x, y, 'powerup-sprite');

// Add collision detection
this.physics.add.overlap(this.player.sprite, this.powerups, this.collectPowerup, null, this);

// Collect powerup method
collectPowerup(playerSprite, powerup) {
    powerup.disableBody(true, true);

    // Apply effect
    // ...

    // Notify server
    this.socket.emit('powerupCollected', {
        lobbyId: this.lobbyId,
        powerupId: powerup.id
    });
}
```

## Common Issues and Fixes

### Camera Issues

-   If cameras aren't working correctly, check if you're using the correct Phaser version
-   The `setFlipY()` method might not be available in some versions
-   Use the manual mirroring approach described in this document

### Multiplayer Synchronization

-   If player positions aren't syncing correctly, make sure you're updating positions in `update()`
-   Check socket connections in the browser console
-   Verify the lobby ID is correctly passed between scenes

### Physics Issues

-   If collisions aren't working, make sure you're adding physics bodies correctly
-   Verify that collision groups are set up properly
-   Check if object scales and sizes are appropriate for collision detection

### Button Interaction Errors

-   If UI buttons cause errors, reconstruct them completely when updating
-   Avoid modifying properties of potentially undefined objects
-   Check if `input` property exists before setting `enabled`

---

This documentation provides an overview of the current state of the game and how to work with it. For more detailed information about specific components, refer to the code comments in the respective files.
