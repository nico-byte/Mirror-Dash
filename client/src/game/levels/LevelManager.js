/**
 * LevelManager class to handle loading and rendering different game levels
 */
export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = null;
        this.levels = {};
        this.pendingPlatforms = [];
        this.pendingJumpPads = [];
        this.initialized = false;
    }

    init(scene) {
        this.scene = scene;
        this.currentLevel = null;
        this.levels = {};
        this.pendingPlatforms = [];
        this.pendingJumpPads = [];
        this.initialized = false;
    }

    /**
     * Register a level with the manager
     * @param {string} key - The level identifier
     * @param {object} levelData - The level configuration
     */
    registerLevel(key, levelData) {
        this.levels[key] = levelData;
    }

    /**
     * Ensure the scene is fully initialized
     * @returns {boolean} - Whether the scene is ready
     */
    isSceneReady() {
        return this.scene && this.scene.sys && this.scene.physics && this.scene.physics.world;
    }

    /**
     * Initialize the LevelManager with the scene
     * Should be called when scene is fully ready
     */
    initialize() {
        if (this.isSceneReady() && !this.initialized) {
            this.initialized = true;

            // Create physics groups if they don't exist
            if (!this.scene.platforms) {
                this.scene.platforms = this.scene.physics.add.staticGroup();
            }

            if (!this.scene.jumpPads) {
                this.scene.jumpPads = this.scene.physics.add.staticGroup();
            }

            if (!this.scene.movingPlatforms) {
                this.scene.movingPlatforms = this.scene.physics.add.group();
            }
            // Process any pending platforms and jump pads
            this.processPendingObjects();

            console.log("LevelManager initialized successfully");
        } else if (!this.isSceneReady()) {
            console.warn("Scene not fully ready for LevelManager initialization");
        }
    }

    /**
     * Process any pending game objects created before initialization
     */
    processPendingObjects() {
        if (!this.isSceneReady()) {
            console.warn("Scene not ready, cannot process pending objects");
            return;
        }

        // Process pending platforms
        if (this.pendingPlatforms.length > 0) {
            this.pendingPlatforms.forEach(platform => {
                this.createPlatformWithMirror(
                    platform.x,
                    platform.y,
                    platform.texture,
                    platform.scaleX,
                    platform.scaleY,
                    platform.isStatic,
                    platform.motion,
                    platform.range,
                    platform.speed
                );
            });
            this.pendingPlatforms = [];
        }

        // Process pending jump pads
        if (this.pendingJumpPads.length > 0) {
            console.log(`Processing ${this.pendingJumpPads.length} pending jump pads`);
            this.pendingJumpPads.forEach(jumpPad => {
                this.createJumpPadWithMirror(jumpPad.x, jumpPad.y, jumpPad.texture);
            });
            this.pendingJumpPads = [];
        }
    }

    /**
     * Load a specific level with improved error handling
     * @param {string} key - The identifier of the level to load
     * @returns {object} The created level objects
     */
    loadLevel(key) {
        if (!this.levels[key]) {
            // console.error(`Level "${key}" not found!`);
            return null;
        }

        // Ensure LevelManager is initialized
        this.initialize();

        this.currentLevel = key;
        const levelData = this.levels[key];
        console.log(`Starting to load level: "${key}"`);

        // Calculate screen dimensions for mirroring
        const screenHeight = this.scene.scale ? this.scene.scale.height : 768; // Fallback height
        const midPoint = screenHeight / 2;

        // Create background if provided - with error catching
        if (levelData.createBackground && this.isSceneReady()) {
            try {
                levelData.createBackground(this.scene, midPoint);
            } catch (error) {
                // console.error("Error creating background:", error);
            }
        }

        // Create platforms - either directly or queue for later
        if (levelData.platforms) {
            levelData.platforms.forEach(platform => {
                try {
                    if (this.isSceneReady()) {
                        this.createPlatformWithMirror(
                            platform.x,
                            platform.y,
                            platform.texture,
                            platform.scaleX || 1,
                            platform.scaleY || 1,
                            platform.isStatic !== false,
                            platform.motion || null,
                            platform.range || 80,
                            platform.speed || 2000
                        );
                    } else {
                        // Queue for later creation
                        this.pendingPlatforms.push({
                            x: platform.x,
                            y: platform.y,
                            texture: platform.texture,
                            scaleX: platform.scaleX || 1,
                            scaleY: platform.scaleY || 1,
                            isStatic: platform.isStatic !== false,
                            motion: platform.motion || null,
                            range: platform.range || 80,
                            speed: platform.speed || 2000,
                        });
                    }
                } catch (error) {
                    // console.error("Error creating platform:", error, "at", platform.x, platform.y);
                }
            });
        }

        // Create jump pads - either directly or queue for later
        if (levelData.jumpPads) {
            levelData.jumpPads.forEach(jumpPad => {
                try {
                    if (this.isSceneReady()) {
                        this.createJumpPadWithMirror(
                            jumpPad.x,
                            jumpPad.y,
                            jumpPad.texture || "jumppad",
                            jumpPad.scaleX || 1,
                            jumpPad.scaleY || 1
                        );
                    } else {
                        // Queue for later creation
                        this.pendingJumpPads.push({
                            x: jumpPad.x,
                            y: jumpPad.y,
                            texture: jumpPad.texture || "jumppad",
                            scaleX: jumpPad.scaleX || 1,
                            scaleY: jumpPad.scaleY || 1,
                        });
                    }
                } catch (error) {
                    // console.error("Error creating jump pad:", error, "at", jumpPad.x, jumpPad.y);
                }
            });
        }

        // Create spikes with defensive checks
        if (levelData.spikes) {
            levelData.spikes.forEach(spike => {
                try {
                    if (this.isSceneReady()) {
                        this.createSpikesWithMirror(
                            spike.x,
                            spike.y,
                            spike.texture || "spike",
                            spike.scaleX || 1,
                            spike.scaleY || 1
                        );
                    } else {
                        this.pendingSpikes = this.pendingSpikes || [];
                        this.pendingSpikes.push({
                            x: spike.x,
                            y: spike.y,
                            texture: spike.texture || "spike",
                            scaleX: spike.scaleX || 1,
                            scaleY: spike.scaleY || 1,
                        });
                    }
                } catch (error) {
                    // console.error("Error creating spike:", error, "at", spike.x, spike.y);
                }
            });
        }

        // Create finish line with defensive code
        if (levelData.finish && this.isSceneReady()) {
            try {
                this.createFinishWithMirror(
                    levelData.finish.x,
                    levelData.finish.y,
                    levelData.finish.width || 100,
                    levelData.finish.height || 100
                );
            } catch (error) {
                // console.error("Error creating finish line:", error);
            }
        }

        // Set world and camera bounds
        if (this.isSceneReady()) {
            try {
                const worldWidth = levelData.worldBounds?.width || 5000;
                const worldHeight = levelData.worldBounds?.height || 800;
                this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

                if (this.scene.topCamera) {
                    this.scene.topCamera.setBounds(0, 0, worldWidth, worldHeight);
                }

                if (this.scene.bottomCamera) {
                    this.scene.bottomCamera.setBounds(0, 0, worldWidth, worldHeight);
                }
            } catch (error) {
                // console.error("Error setting world bounds:", error);
            }
        }

        console.log(`Level "${key}" loading process initiated`);

        return {
            spawnPoint: levelData.spawnPoint || { x: 230, y: 500 },
            worldBounds: levelData.worldBounds || { width: 5000, height: 800 },
        };
    }

    /**
     * Create a platform with its mirrored version
     */
    createPlatformWithMirror(
        x,
        y,
        texture,
        scaleX = 1,
        scaleY = 1,
        isStatic = true,
        motion = null,
        range = 80,
        speed = 2000
    ) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Queuing platform for later creation.");
            this.pendingPlatforms.push({ x, y, texture, scaleX, scaleY, isStatic, motion, range, speed });
            return { platform: null, mirrorPlatform: null };
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        let platform;
        let mirrorPlatform;

        try {
            if (isStatic) {
                if (!this.scene.platforms) {
                    console.warn("Platforms group is not initialized, creating it now");
                    this.scene.platforms = this.scene.physics.add.staticGroup();
                }

                platform = this.scene.platforms.create(x, y, texture);

                if (platform) {
                    platform.setScale(scaleX, scaleY);
                    platform.body.moves = false;
                    platform.body.allowGravity = false;
                    platform.body.immovable = true;
                    platform.refreshBody();
                }
            } else {
                if (!this.scene.movingPlatforms) {
                    this.scene.movingPlatforms = this.scene.physics.add.group({
                        immovable: true,
                        allowGravity: false,
                    });
                }

                platform = this.scene.physics.add.image(x, y, texture);
                platform.setScale(scaleX, scaleY);
                platform.setImmovable(true);
                platform.body.allowGravity = false;
                platform.body.moves = true;
                platform.body.velocity.set(0);

                platform.body.checkCollision.down = true;
                platform.body.checkCollision.left = true;
                platform.body.checkCollision.right = true;
                platform.body.checkCollision.up = true;

                platform.platformData = {
                    motion,
                    range,
                    speed,
                    originX: x,
                    originY: y,
                };

                this.scene.movingPlatforms.add(platform);

                if (!this.movingPlatforms) this.movingPlatforms = [];
                this.movingPlatforms.push({
                    platform,
                    motion,
                    range,
                    speed,
                    baseX: x,
                    baseY: y,
                });
            }

            if (this.scene.add) {
                mirrorPlatform = this.scene.add
                    .image(x, screenHeight - y + midPoint, texture)
                    .setScale(scaleX, scaleY)
                    .setFlipY(true);
            }

            if (this.scene.topCamera && mirrorPlatform) this.scene.topCamera.ignore(mirrorPlatform);
            if (this.scene.bottomCamera && platform) this.scene.bottomCamera.ignore(platform);

            return { platform, mirrorPlatform };
        } catch (error) {
            // console.error("Error creating platform:", error, "at position:", x, y);
            return { platform: null, mirrorPlatform: null };
        }
    }

    /**
     * Call this from scene.update()
     */
    updateMovingPlatforms(time) {
        if (!this.movingPlatforms) return;

        this.movingPlatforms.forEach(({ platform, motion, range, speed, baseX, baseY }) => {
            if (!platform || !platform.body) return;

            const t = time / (speed || 2000);
            const amplitude = Math.abs(range || 80);

            if (motion === "vertical") {
                // Calculate new position based on sine wave with high precision
                const newY = baseY + Math.sin(t) * amplitude;

                // Store old position before update for precise delta calculation
                const oldY = platform.y;

                // Update position
                platform.setY(newY);

                // Calculate velocity based on cosine (derivative of sine) for smooth movement
                // Multiply by appropriate factor to match the sine wave's amplitude and frequency
                const velocity = (Math.cos(t) * amplitude * Math.PI) / (speed / 1000);
                platform.body.velocity.y = velocity;
                platform.body.velocity.x = 0; // No horizontal movement

                // Set precise previous position for exact delta calculation
                platform.body.prev.y = oldY;

                // Store exact delta value for collision handler to use
                platform.body._deltaY = newY - oldY;
            } else if (motion === "horizontal") {
                // Calculate new position based on sine wave with high precision
                const newX = baseX + Math.sin(t) * amplitude;

                // Store old position before update for precise delta calculation
                const oldX = platform.x;

                // Update position
                platform.setX(newX);

                // Calculate velocity based on cosine (derivative of sine) for smooth movement
                const velocity = (Math.cos(t) * amplitude * Math.PI) / (speed / 1000);
                platform.body.velocity.x = velocity;
                platform.body.velocity.y = 0; // No vertical movement

                // Set precise previous position for exact delta calculation
                platform.body.prev.x = oldX;

                // Store exact delta value for collision handler to use
                platform.body._deltaX = newX - oldX;
            }

            // Override the built-in deltaX/deltaY methods to use our precise values
            platform.body.deltaX = function () {
                return this._deltaX !== undefined ? this._deltaX : this.position.x - this.prev.x;
            };

            platform.body.deltaY = function () {
                return this._deltaY !== undefined ? this._deltaY : this.position.y - this.prev.y;
            };

            // Make sure the physics body is updated with new position
            platform.body.updateFromGameObject();

            // Set proper platform properties every frame to ensure collisions work
            platform.body.immovable = true;
            platform.body.moves = true;
            platform.body.allowGravity = false;

            // Explicitly refresh collision box dimensions
            if (platform.refreshBody) {
                platform.refreshBody();
            }
        });
    }

    /**
     * Create a jump pad with its mirrored version
     */
    createJumpPadWithMirror(x, y, texture = "jumppad", scaleX = 1, scaleY = 1) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Queuing jump pad for later creation.");
            this.pendingJumpPads.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        try {
            if (!this.scene.jumpPads) {
                console.warn("Jump pads group is not initialized, creating it now");
                this.scene.jumpPads = this.scene.physics.add.staticGroup();
            }

            const jumpPad = this.scene.jumpPads.create(x, y, texture);
            jumpPad.setScale(scaleX, scaleY);
            jumpPad.refreshBody();

            // Create mirrored version for bottom view
            const mirrorJumpPad = this.scene.add
                .image(x, screenHeight - y + midPoint, texture)
                .setScale(scaleX, scaleY)
                .setFlipY(true);

            // Set camera visibility - THIS IS THE FIX
            if (this.scene.topCamera) this.scene.topCamera.ignore(mirrorJumpPad);
            if (this.scene.bottomCamera) this.scene.bottomCamera.ignore(jumpPad);

            return jumpPad;
        } catch (error) {
            // console.error("Error creating jump pad:", error, "at position:", x, y);
            return null;
        }
    }

    createSpikesWithMirror(x, y, texture = "spike", scaleX = 1, scaleY = 1) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Queuing spikes for later creation.");
            this.pendingSpikes = this.pendingSpikes || [];
            this.pendingSpikes.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        // Defensive check - make sure the scene and its physics system are valid
        if (!this.scene || !this.scene.add || !this.scene.physics) {
            // console.error("Invalid scene object when creating spikes at", x, y);
            return null;
        }

        const screenHeight = this.scene.scale ? this.scene.scale.height : 768;
        const midPoint = screenHeight / 2;

        try {
            // Ensure spike group exists with additional safety check
            if (!this.scene.spikeGroup) {
                // This is the key fix - create a static physics group if it doesn't exist
                this.scene.spikeGroup = this.scene.physics.add.staticGroup();
            }

            // Create the spike with more defensive checks
            let spike = null;
            try {
                spike = this.scene.spikeGroup.create(x, y, texture);
                spike.setScale(scaleX, scaleY);
                if (spike.refreshBody) {
                    spike.refreshBody();
                }
            } catch (err) {
                // console.error(`Failed to create spike at ${x},${y}:`, err);
                return null;
            }

            // Create mirrored spike with defensive checks
            let mirrorSpike = null;
            try {
                mirrorSpike = this.scene.add
                    .image(x, screenHeight - y + midPoint, texture)
                    .setScale(scaleX, scaleY)
                    .setFlipY(true);
            } catch (err) {
                // console.error(`Failed to create mirror spike at ${x},${screenHeight - y + midPoint}:`, err);
            }

            // Safely set camera visibility
            this.safelySetCameraVisibility(this.scene.topCamera, [mirrorSpike]);
            this.safelySetCameraVisibility(this.scene.bottomCamera, [spike]);

            return spike;
        } catch (error) {
            console.error("Error creating spikes:", error, "at position:", x, y);
            return null;
        }
    }

    // Helper method for safely setting camera visibility
    safelySetCameraVisibility(camera, objects) {
        if (!camera || !objects) return;

        for (const obj of objects) {
            if (obj && camera.ignore) {
                try {
                    camera.ignore(obj);
                } catch (err) {
                    console.warn("Error setting camera visibility:", err);
                }
            }
        }
    }

    /**
     * Setup collisions between player and jumpPads
     */
    setupJumpPadCollisions(player) {
        if (!this.scene || !this.scene.physics || !this.scene.jumpPads) {
            console.warn("JumpPad collision setup skipped: scene not ready or jumpPads missing.");
            return;
        }

        this.scene.physics.add.overlap(player, this.scene.jumpPads, (player, pad) => {
            try {
                const playerBottom = player.y + player.body.height / 2;
                const padTop = pad.y - pad.body.height / 2;
                const isAbove = playerBottom <= padTop + 10;
                const isFalling = player.body.velocity.y > 0;

                if (isAbove && isFalling) {
                    if (!pad.cooldown) {
                        player.body.setVelocityY(-5000); // Apply jump force

                        this.scene.tweens.add({
                            targets: pad,
                            scaleY: 0.8,
                            duration: 100,
                            yoyo: true,
                            ease: "Power1",
                        });

                        pad.cooldown = true;
                        this.scene.time.delayedCall(500, () => {
                            pad.cooldown = false;
                        });
                    } else {
                        console.warn("JumpPad is on cooldown", { pad });
                    }
                } else {
                    console.warn("JumpPad conditions not met", { playerBottom, padTop, isAbove, isFalling });
                }
            } catch (error) {
                // console.error("Error during JumpPad collision handling", error);
            }
        });
    }

    /**
     * Create a finish line with its mirrored version
     */
    createFinishWithMirror(x, y, width, height) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Cannot create finish line yet.");
            this.pendingFinish = { x, y, width, height };
            return null;
        }

        // Defensive check
        if (!this.scene || !this.scene.add || !this.scene.physics) {
            // console.error("Invalid scene object when creating finish line at", x, y);
            return null;
        }

        try {
            const screenHeight = this.scene.scale.height;
            const midPoint = screenHeight / 2;

            // Create finish object (collision)
            if (!this.scene.finishObject) {
                this.scene.finishObject = this.scene.physics.add.staticGroup();
            }

            // Safely create the finish object
            let finishObjectRect = null;
            try {
                finishObjectRect = this.scene.finishObject
                    .create(x, y, "pokal")
                    .setSize(width, height)
                    .setDisplaySize(width, height)
                    .setOrigin(0.5);

                if (finishObjectRect.refreshBody) {
                    finishObjectRect.refreshBody();
                }

                this.scene.finishObjectRect = finishObjectRect;
            } catch (err) {
                // console.error("Error creating finish object:", err);
            }

            // Create visual indicators for top and bottom views
            let finishVisual = null;
            let mirrorFinishVisual = null;

            try {
                // Visual for finish line (top view)
                finishVisual = this.scene.add.rectangle(x, y, width, height, 0xff0000).setAlpha(0.6);
                this.scene.finishVisual = finishVisual;

                // Mirror finish line for bottom view
                mirrorFinishVisual = this.scene.add
                    .rectangle(x, screenHeight - y + midPoint, width, height, 0xff0000)
                    .setAlpha(0.6)
                    .setDepth(1);
                this.scene.mirrorFinishVisual = mirrorFinishVisual;
            } catch (err) {
                // console.error("Error creating finish visuals:", err);
            }

            // Set camera visibility with safety checks
            this.safelySetCameraVisibility(this.scene.bottomCamera, [finishObjectRect, finishVisual]);
            this.safelySetCameraVisibility(this.scene.topCamera, [mirrorFinishVisual]);

            return {
                finishObject: this.scene.finishObject,
                finishVisual: finishVisual,
                mirrorFinishVisual: mirrorFinishVisual,
            };
        } catch (error) {
            // console.error("Error creating finish line:", error, "at position:", x, y);
            return null;
        }
    }

    /**
     * Get the starting position for a player in the current level
     * @returns {object} The spawn coordinates {x, y}
     */
    getPlayerSpawnPosition() {
        if (!this.currentLevel || !this.levels[this.currentLevel]) {
            // Default spawn position if no level loaded
            return { x: 230, y: 500 };
        }

        const levelData = this.levels[this.currentLevel];
        return levelData.spawnPoint || { x: 230, y: 500 };
    }

    /**
     * Get the name of the current level
     * @returns {string} The name of the current level
     */
    getCurrentLevelName() {
        if (!this.currentLevel || !this.levels[this.currentLevel]) {
            return "Unknown Level";
        }

        const levelData = this.levels[this.currentLevel];
        return levelData.name || this.currentLevel;
    }

    /**
     * Get the ID of the current level
     * @returns {string} The ID of the current level
     */
    getMovingPlatforms() {
        if (!this.currentLevel || !this.levels[this.currentLevel]) {
            return [];
        }

        const levelData = this.levels[this.currentLevel];
        return levelData.movingPlatforms || [];
    }
}
