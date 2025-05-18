export class PlayerConnection {
    constructor(scene) {
        this.scene = scene;
        // Beams for top view
        this.beam = null;
        this.glow = null;
        // Beams for bottom view
        this.mirrorBeam = null;
        this.mirrorGlow = null;

        this.particleEmitter = null;
        this.mirrorParticleEmitter = null;
        this.initialized = false;
    }

    init(scene) {
        this.scene = scene;
        // Beams for top view
        this.beam = null;
        this.glow = null;
        // Beams for bottom view
        this.mirrorBeam = null;
        this.mirrorGlow = null;

        this.particleEmitter = null;
        this.mirrorParticleEmitter = null;
        this.initialized = false;
    }

    initialize() {
        // Create the beam graphics objects for top view
        this.beam = this.scene.add.graphics();
        this.glow = this.scene.add.graphics();

        // Create the beam graphics objects for bottom view
        this.mirrorBeam = this.scene.add.graphics();
        this.mirrorGlow = this.scene.add.graphics();

        // Set up camera visibility
        if (this.scene.topCamera) {
            this.scene.topCamera.ignore([this.mirrorBeam, this.mirrorGlow]);
        }

        if (this.scene.bottomCamera) {
            this.scene.bottomCamera.ignore([this.beam, this.glow]);
        }

        // Set initial depth
        this.beam.setDepth(10);
        this.glow.setDepth(9);
        this.mirrorBeam.setDepth(10);
        this.mirrorGlow.setDepth(9);

        // Create particle emitters for added effect
        this.createParticleEmitters();

        this.initialized = true;
    }

    createParticleEmitters() {
        // Create a particle texture if it doesn't exist
        if (!this.scene.textures.exists("particle")) {
            const graphics = this.scene.add.graphics();
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(8, 8, 8);
            graphics.generateTexture("particle", 16, 16);
            graphics.destroy();
        }

        // Create particle emitter for top view
        this.particleEmitter = this.scene.add.particles(0, 0, "particle", {
            speed: { min: 10, max: 30 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 1000,
            blendMode: "ADD",
            frequency: 50,
            emitting: false,
        });

        // Create particle emitter for bottom view
        this.mirrorParticleEmitter = this.scene.add.particles(0, 0, "particle", {
            speed: { min: 10, max: 30 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 1000,
            blendMode: "ADD",
            frequency: 50,
            emitting: false,
        });

        // Set camera visibility for particles
        if (this.scene.topCamera) {
            this.scene.topCamera.ignore(this.mirrorParticleEmitter);
        }

        if (this.scene.bottomCamera) {
            this.scene.bottomCamera.ignore(this.particleEmitter);
        }
    }

    update() {
        if (!this.initialized || !this.scene.player || !this.scene.otherPlayers) return;

        // Get the first other player (we're only handling 2-player games)
        const otherPlayerIds = Object.keys(this.scene.otherPlayers);
        if (otherPlayerIds.length === 0) return;

        const otherPlayer = this.scene.otherPlayers[otherPlayerIds[0]];
        if (!otherPlayer) return;

        // Calculate positions for top view
        const startX = this.scene.player.x;
        const startY = this.scene.player.y;
        const endX = otherPlayer.x;
        const endY = otherPlayer.y;

        // Calculate positions for bottom view (need to use mirror sprites)
        const mirrorStartX = otherPlayer.mirrorSprite ? otherPlayer.mirrorSprite.x : endX;
        const mirrorStartY = otherPlayer.mirrorSprite ? otherPlayer.mirrorSprite.y : this.getMirrorY(endY);
        const mirrorEndX = this.scene.player.sprite.x; // Use player's actual sprite
        const mirrorEndY = this.getMirrorY(this.scene.player.sprite.y);

        // Calculate the distance between players
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

        // Draw the beams with pulsating effect
        this.drawBeam(startX, startY, endX, endY, distance, false);
        this.drawBeam(mirrorStartX, mirrorStartY, mirrorEndX, mirrorEndY, distance, true);

        // Update particle emitters
        this.updateParticles(startX, startY, endX, endY, false);
        this.updateParticles(mirrorStartX, mirrorStartY, mirrorEndX, mirrorEndY, true);
    }

    // Helper method to calculate mirror Y position
    getMirrorY(y) {
        if (!this.scene.scale) return y;

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;
        return screenHeight - y + midPoint;
    }

    drawBeam(startX, startY, endX, endY, distance, isMirror) {
        // Use the correct beam and glow objects based on mirror flag
        const beam = isMirror ? this.mirrorBeam : this.beam;
        const glow = isMirror ? this.mirrorGlow : this.glow;

        // Clear previous graphics
        beam.clear();
        glow.clear();

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
        glow.lineStyle(8 * pulseScale, 0xffffff, 0.3);
        glow.beginPath();
        glow.moveTo(startX, startY);
        glow.lineTo(endX, endY);
        glow.closePath();
        glow.strokePath();

        // Draw the main beam
        beam.lineStyle(3 * pulseScale, Phaser.Display.Color.GetColor(r, g, b), a);
        beam.beginPath();
        beam.moveTo(startX, startY);
        beam.lineTo(endX, endY);
        beam.closePath();
        beam.strokePath();

        // If distance is too great, make the beam blink to warn players
        if (ratio > 0.8) {
            const blink = Math.sin(this.scene.time.now / 100) > 0;
            beam.visible = blink;
            glow.visible = blink;
        } else {
            beam.visible = true;
            glow.visible = true;
        }
    }

    updateParticles(startX, startY, endX, endY, isMirror) {
        // Use the correct particle emitter based on mirror flag
        const emitter = isMirror ? this.mirrorParticleEmitter : this.particleEmitter;
        if (!emitter) return;

        // Calculate the middle point of the beam for particles
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Set particle emitter to the middle of the connection
        emitter.setPosition(midX, midY);

        // Enable particles if the beam is active
        emitter.active = true;

        // Add additional particles at the end of the beam as an indicator
        const endEmitter = this.scene.add.particles(endX, endY, "particle", {
            speed: { min: 20, max: 40 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 500, // Short lifespan for quick disappearance
            blendMode: "ADD",
            frequency: 50, // Higher frequency for more dynamic effect
            emitting: true,
        });

        // Destroy the particle emitter after its lifespan
        this.scene.time.delayedCall(500, () => {
            endEmitter.destroy();
        });

        // Set camera visibility for the end emitter
        if (isMirror && this.scene.topCamera) {
            this.scene.topCamera.ignore(endEmitter);
        } else if (!isMirror && this.scene.bottomCamera) {
            this.scene.bottomCamera.ignore(endEmitter);
        }
    }

    shutdown() {
        // Clean up top view resources
        if (this.particleEmitter) {
            this.particleEmitter.active = false;
            this.particleEmitter.destroy();
        }

        if (this.beam) {
            this.beam.clear();
            this.beam.destroy();
        }

        if (this.glow) {
            this.glow.clear();
            this.glow.destroy();
        }

        // Clean up bottom view resources
        if (this.mirrorParticleEmitter) {
            this.mirrorParticleEmitter.active = false;
            this.mirrorParticleEmitter.destroy();
        }

        if (this.mirrorBeam) {
            this.mirrorBeam.clear();
            this.mirrorBeam.destroy();
        }

        if (this.mirrorGlow) {
            this.mirrorGlow.clear();
            this.mirrorGlow.destroy();
        }
    }
}
