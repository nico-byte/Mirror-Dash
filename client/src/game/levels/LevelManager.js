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
            console.log(`Processing ${this.pendingPlatforms.length} pending platforms`);
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
                this.createJumpPadWithMirror(jumpPad.x, jumpPad.y, jumpPad.color);
            });
            this.pendingJumpPads = [];
        }
    }

    /**
     * Load a specific level
     * @param {string} key - The identifier of the level to load
     * @returns {object} The created level objects
     */
    loadLevel(key) {
        if (!this.levels[key]) {
            console.error(`Level "${key}" not found!`);
            return null;
        }

        // Ensure LevelManager is initialized
        this.initialize();

        this.currentLevel = key;
        const levelData = this.levels[key];

        // Calculate screen dimensions for mirroring
        const screenHeight = this.scene.scale ? this.scene.scale.height : 768; // Fallback height
        const midPoint = screenHeight / 2;

        // Create background if provided
        if (levelData.createBackground && this.isSceneReady()) {
            levelData.createBackground(this.scene, midPoint);
        }

        // Create platforms - either directly or queue for later
        levelData.platforms.forEach(platform => {
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
                    speed: platform.speed || 2000
                });
                console.log(`Queued platform at ${platform.x}, ${platform.y} for later creation`);
            }
        });

        // Create jump pads - either directly or queue for later
        if (levelData.jumpPads) {
            levelData.jumpPads.forEach(jumpPad => {
                if (this.isSceneReady()) {
                    this.createJumpPadWithMirror(jumpPad.x, jumpPad.y, jumpPad.color || 0xffff00);
                } else {
                    // Queue for later creation
                    this.pendingJumpPads.push({
                        x: jumpPad.x,
                        y: jumpPad.y,
                        color: jumpPad.color || 0xffff00,
                    });
                    console.log(`Queued jump pad at ${jumpPad.x}, ${jumpPad.y} for later creation`);
                }
            });
        }

        // Create finish line
        if (levelData.finish && this.isSceneReady()) {
            this.createFinishWithMirror(
                levelData.finish.x,
                levelData.finish.y,
                levelData.finish.width || 100,
                levelData.finish.height || 100
            );
        }

        // Set world and camera bounds
        if (this.isSceneReady()) {
            const worldWidth = levelData.worldBounds?.width || 5000;
            const worldHeight = levelData.worldBounds?.height || 800;
            this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

            if (this.scene.topCamera) {
                this.scene.topCamera.setBounds(0, 0, worldWidth, worldHeight);
            }

            if (this.scene.bottomCamera) {
                this.scene.bottomCamera.setBounds(0, 0, worldWidth, worldHeight);
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
    createPlatformWithMirror(x, y, texture, scaleX = 1, scaleY = 1, isStatic = true, motion = null, range = 80, speed = 2000) {
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
                        allowGravity: false
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
                    originY: y
                };

                this.scene.movingPlatforms.add(platform);

                if (!this.movingPlatforms) this.movingPlatforms = [];
                this.movingPlatforms.push({
                    platform,
                    motion,
                    range,
                    speed,
                    baseX: x,
                    baseY: y
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
            console.error("Error creating platform:", error, "at position:", x, y);
            return { platform: null, mirrorPlatform: null };
        }
    }


       /**
     * Call this from scene.update()
     */
    updateMovingPlatforms(time) {
        if (!this.movingPlatforms) return;

        this.movingPlatforms.forEach(({platform, motion, range, speed, baseX, baseY}) => {
            if (!platform || !platform.body) return;

            const t = time / (speed || 2000);
            const amplitude = Math.abs(range || 80);

            if (motion === "vertical") {
                const newY = baseY + Math.sin(t) * amplitude;
                platform.setY(newY);
                platform.body.velocity.y = Math.cos(t) * amplitude * Math.PI / (speed / 1000);
                platform.body.velocity.x = 0; // Keine horizontale Bewegung
            } else if (motion === "horizontal") {
                const newX = baseX + Math.sin(t) * amplitude;
                platform.setX(newX);
                platform.body.velocity.x = Math.cos(t) * amplitude * Math.PI / (speed / 1000);
                platform.body.velocity.y = 0; // Keine vertikale Bewegung
            }

            platform.body.updateFromGameObject();
        });
    }

    /**
     * Create a jump pad with its mirrored version
     */
    createJumpPadWithMirror(x, y, color) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Queuing jump pad for later creation.");
            this.pendingJumpPads.push({ x, y, color });
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        try {
            if (!this.scene.jumpPads) {
                console.warn("Jump pads group is not initialized, creating it now");
                this.scene.jumpPads = this.scene.physics.add.staticGroup();
            }

            const jumpPad = this.scene.jumpPads.create(x, y, null);
            jumpPad.setScale(2, 0.5).setSize(30, 15).setDisplaySize(60, 15).setTint(color).refreshBody();

            const arrow = this.scene.add.triangle(x, y - 20, 0, 15, 15, -15, 30, 15, 0xffffff);
            arrow.setDepth(1);

            const mirrorJumpPad = this.scene.add.rectangle(x, screenHeight - y + midPoint, 60, 15, color);

            const mirrorArrow = this.scene.add.triangle(
                x,
                screenHeight - (y - 20) + midPoint,
                0,
                -15,
                15,
                15,
                30,
                -15,
                0xffffff
            );
            mirrorArrow.setDepth(1);

            if (this.scene.topCamera) this.scene.topCamera.ignore([mirrorJumpPad, mirrorArrow]);
            if (this.scene.bottomCamera) this.scene.bottomCamera.ignore([jumpPad, arrow]);

            return jumpPad;
        } catch (error) {
            console.error("Error creating jump pad:", error, "at position:", x, y);
            return null;
        }
    }

    /**
     * Create a finish line with its mirrored version
     */
    createFinishWithMirror(x, y, width, height) {
        if (!this.isSceneReady()) {
            console.warn("Scene not fully initialized! Cannot create finish line yet.");
            return null;
        }

        try {
            const screenHeight = this.scene.scale.height;
            const midPoint = screenHeight / 2;

            // Create finish object (collision)
            this.scene.finishObject = this.scene.physics.add.staticGroup();
            this.scene.finishObjectRect = this.scene.finishObject
                .create(x, y, null)
                .setSize(width, height)
                .setDisplaySize(width, height)
                .setOrigin(0.5)
                .refreshBody();
            this.scene.finishObjectRect.fillColor = 0xff0000;

            // Visual fill for finish line (top view)
            this.scene.finishVisual = this.scene.add.rectangle(x, y, width, height, 0xff0000);
            this.scene.finishVisual.setDepth(1);

            // Mirror finish line for bottom view
            this.scene.mirrorFinishVisual = this.scene.add.rectangle(
                x,
                screenHeight - y + midPoint,
                width,
                height,
                0xff0000
            );
            this.scene.mirrorFinishVisual.setDepth(1);

            // Set camera visibility
            if (this.scene.bottomCamera) {
                this.scene.bottomCamera.ignore([this.scene.finishObjectRect, this.scene.finishVisual]);
            }

            if (this.scene.topCamera) {
                this.scene.topCamera.ignore(this.scene.mirrorFinishVisual);
            }

            return {
                finishObject: this.scene.finishObject,
                finishVisual: this.scene.finishVisual,
                mirrorFinishVisual: this.scene.mirrorFinishVisual,
            };
        } catch (error) {
            console.error("Error creating finish line:", error, "at position:", x, y);
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