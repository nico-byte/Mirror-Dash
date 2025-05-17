export class CameraManager {
    constructor(scene, autoScrollCamera = false, scrollSpeed = 0) {
        this.scene = scene;
        // Camera scrolling properties
        this.autoScrollCamera = autoScrollCamera;
        this.scrollSpeed = scrollSpeed;
    }

    setupCameras() {
        const { cameras, scale, add } = this.scene;

        // Get camera settings from environment variables
        this.autoScrollCamera = import.meta.env.VITE_AUTO_SCROLL_CAMERA === "true";
        this.scrollSpeed = parseFloat(import.meta.env.VITE_CAMERA_SCROLL_SPEED || "50");

        // Modify the main camera for the top half
        cameras.main.setViewport(0, 0, scale.width, scale.height / 2);
        cameras.main.setBackgroundColor(0x87ceeb); // Light blue sky
        cameras.main.setName("topCamera");
        cameras.main.setBounds(0, 0, 3000, 1000);
        this.scene.topCamera = cameras.main;

        // Calculate the midpoint of the screen height
        const midPoint = scale.height / 2;

        // Create bottom camera
        this.scene.bottomCamera = cameras.add(0, midPoint, scale.width, midPoint);
        this.scene.bottomCamera.setBackgroundColor(0x87ceeb);
        this.scene.bottomCamera.setName("bottomCamera");
        this.scene.bottomCamera.setBounds(0, 0, 3000, 1000);

        // Add split line between views
        this.scene.splitLine = add.rectangle(scale.width / 2, midPoint, scale.width, 4, 0x000000);
        this.scene.splitLine.setDepth(100);
        this.scene.splitLine.setScrollFactor(0);
    }

    updateCameras() {
        // Update the top camera to follow the main player (Y-axis only)
        if (this.scene.topCamera && this.scene.player.sprite) {
            if (!this.scene.topCamera._follow) {
                this.scene.topCamera.startFollow(this.scene.player.sprite, false, 0, 1); // Only follow Y (0 for X, 1 for Y)
            }

            // If auto-scrolling is enabled, move camera horizontally (not the player)
            if (this.scene.autoScrollCamera) {
                this.scene.topCamera.scrollX += this.scene.scrollSpeed * (this.scene.game.loop.delta / 1000);

                // Camera scrolls independently, player can move at their own pace
                // No automatic player movement - let player control their character
            }
        }

        // Update the bottom camera to follow the other player's mirrored sprite (Y-axis only)
        if (this.scene.bottomCamera) {
            const otherPlayerIds = Object.keys(this.scene.otherPlayers);
            if (otherPlayerIds.length > 0 && this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite) {
                // Follow the other player's mirrored sprite in bottom camera
                if (
                    !this.scene.bottomCamera._follow ||
                    this.scene.bottomCamera._follow !== this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite
                ) {
                    this.scene.bottomCamera.startFollow(this.scene.otherPlayers[otherPlayerIds[0]].mirrorSprite, false, 0, 1); // Y-axis only
                }

                // Match X scrolling with top camera if auto-scrolling
                if (this.scene.autoScrollCamera && this.scene.topCamera) {
                    this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
                }
            } else if (this.scene.topCamera) {
                // If no other player, match top camera scroll position
                this.scene.bottomCamera.scrollX = this.scene.topCamera.scrollX;
            }
        }
    }
}