export class PlayerRespawn {
    constructor(scene) {
        this.scene = scene;
        this.gameTimer = null;
    }

    setGameTimer(gameTimer) {
        this.gameTimer = gameTimer;
    }

    checkPlayerRespawn(player, topCamera, autoScrollCamera) {
        // Define the world bounds
        const worldBottom = 650; // Adjust based on your level height

        // Check if the main player has fallen out of bounds or is caught by the camera
        if (player && player.sprite && player.sprite.body) {
            // Only check for camera catching player if auto-scroll is enabled
            // This should still work even with the new dynamic camera behavior
            // since we'll always penalize players who fall behind the left edge
            const caughtByCamera = autoScrollCamera && topCamera && player.x < topCamera.scrollX + 10; // Player is behind camera's left edge
            const fallenOffMap = player.y > worldBottom;

            if (fallenOffMap || caughtByCamera) {
                let newX = player.x;
                let newY = 0; // Respawn from top

                // If caught by camera, teleport ahead of camera position
                if (caughtByCamera) {
                    newX = topCamera.scrollX + 250; // Teleport 250 pixels ahead of camera
                    console.log("Player caught by camera - respawning ahead");
                } else if (fallenOffMap) {
                    console.log("Player fell off map - respawning from top");
                }

                // Apply penalty
                if (this.gameTimer) {
                    this.gameTimer.applyPenalty();
                }

                // Respawn player
                player.sprite.setPosition(newX, newY);
                player.sprite.body.setVelocity(0, 0);

                // Send update to other players immediately
                if (this.scene.socket && this.scene.socket.connected && this.scene.lobbyId) {
                    this.scene.socket.emit("playerUpdate", {
                        lobbyId: this.scene.lobbyId,
                        x: newX,
                        y: newY,
                        animation: "idle",
                        direction: player.direction,
                    });
                }
            }
        }
    }
}
