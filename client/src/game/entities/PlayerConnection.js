export class PlayerConnection {
    constructor(scene) {
        this.scene = scene;
        this.beam = null;
        this.glow = null;
        this.initialized = false;
    }

    init(scene) {
        this.scene = scene;
        this.beam = null;
        this.glow = null;
        this.initialized = false;
    }

    initialize() {
        // Create the beam graphics objects
        this.beam = this.scene.add.graphics();
        this.glow = this.scene.add.graphics();

        // Set initial depth
        this.beam.setDepth(10);
        this.glow.setDepth(9);

        this.initialized = true;
    }

    update() {
        if (!this.initialized || !this.scene.player || !this.scene.otherPlayers) return;

        // Get the first other player (we're only handling 2-player games)
        const otherPlayerIds = Object.keys(this.scene.otherPlayers);
        if (otherPlayerIds.length === 0) return;

        const otherPlayer = this.scene.otherPlayers[otherPlayerIds[0]];
        if (!otherPlayer) return;

        // Calculate positions
        const startX = this.scene.player.x;
        const startY = this.scene.player.y;
        const endX = otherPlayer.x;
        const endY = otherPlayer.y;

        // Calculate the distance between players
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

        // Draw the beam with pulsating effect
        this.drawBeam(startX, startY, endX, endY, distance);
    }

    drawBeam(startX, startY, endX, endY, distance) {
        // Clear previous graphics
        this.beam.clear();
        this.glow.clear();

        // Calculate beam color based on distance (green to red as distance increases)
        const maxSafeDistance = 800; // Maximum distance before the beam turns red
        const ratio = Math.min(distance / maxSafeDistance, 1);

        // Create a color gradient from green to red
        const r = Math.floor(255 * ratio);
        const g = Math.floor(255 * (1 - ratio));
        const b = 100;
        const a = 0.7; // Alpha

        // Create a pulsating effect
        const time = this.scene.time.now / 500;
        const pulseScale = 0.5 + Math.sin(time) * 0.2;

        // Draw the glow (wider beam behind the main beam)
        this.glow.lineStyle(8 * pulseScale, 0xffffff, 0.3);
        this.glow.beginPath();
        this.glow.moveTo(startX, startY);
        this.glow.lineTo(endX, endY);
        this.glow.closePath();
        this.glow.strokePath();

        // Draw the main beam
        this.beam.lineStyle(3 * pulseScale, Phaser.Display.Color.GetColor(r, g, b), a);
        this.beam.beginPath();
        this.beam.moveTo(startX, startY);
        this.beam.lineTo(endX, endY);
        this.beam.closePath();
        this.beam.strokePath();

        // If distance is too great, make the beam blink to warn players
        if (ratio > 0.8) {
            const blink = Math.sin(this.scene.time.now / 100) > 0;
            this.beam.visible = blink;
            this.glow.visible = blink;
        } else {
            this.beam.visible = true;
            this.glow.visible = true;
        }
    }

    shutdown() {
        // Clean up resources
        if (this.beam) {
            this.beam.clear();
            this.beam.destroy();
        }

        if (this.glow) {
            this.glow.clear();
            this.glow.destroy();
        }
    }
}
