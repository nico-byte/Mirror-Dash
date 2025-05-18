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
        this.pendingSpikes = [];
        this.pendingPortals = [];
        this.pendingFinish = null;
        this.initialized = false;
    }

    init(scene) {
        this.scene = scene;
        this.currentLevel = null;
        this.levels = {};
        this.pendingPlatforms = [];
        this.pendingJumpPads = [];
        this.pendingSpikes = [];
        this.pendingPortals = [];
        this.pendingFinish = null;
        this.initialized = false;
    }

    /**
     * Register a level with the manager
     * @param {string} key - The level identifier
     * @param {object} levelData - The level configuration
     */
    registerLevel(key, levelData) {
        if (key && levelData) {
            this.levels[key] = levelData;
        }
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

            if (!this.scene.spikeGroup) {
                this.scene.spikeGroup = this.scene.physics.add.staticGroup();
            }

            if (!this.scene.finishObject) {
                this.scene.finishObject = this.scene.physics.add.staticGroup();
            }

            if (!this.scene.portals) {
                this.scene.portals = this.scene.physics.add.staticGroup();
            }

            // Process any pending objects
            this.processPendingObjects();
        }
    }

    /**
     * Process any pending game objects created before initialization
     */
    processPendingObjects() {
        if (!this.isSceneReady()) return;

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
            this.pendingJumpPads.forEach(jumpPad => {
                this.createJumpPadWithMirror(jumpPad.x, jumpPad.y, jumpPad.texture, jumpPad.scaleX, jumpPad.scaleY);
            });
            this.pendingJumpPads = [];
        }

        // Process pending spikes
        if (this.pendingSpikes.length > 0) {
            this.pendingSpikes.forEach(spike => {
                this.createSpikesWithMirror(spike.x, spike.y, spike.texture, spike.scaleX, spike.scaleY);
            });
            this.pendingSpikes = [];
        }

        // Process pending portals
        if (this.pendingPortals && this.pendingPortals.length > 0) {
            this.pendingPortals.forEach(portal => {
                this.createPortalWithMirror(portal.x, portal.y, portal.texture, portal.scaleX, portal.scaleY);
            });
            this.pendingPortals = [];
        }

        // Process pending finish line
        if (this.pendingFinish) {
            this.createFinishWithMirror(
                this.pendingFinish.x,
                this.pendingFinish.y,
                this.pendingFinish.width,
                this.pendingFinish.height
            );
            this.pendingFinish = null;
        }
    }

    /**
     * Load a specific level with improved error handling
     * @param {string} key - The identifier of the level to load
     * @returns {object} The created level objects
     */
    loadLevel(key) {
        if (!this.levels[key]) {
            return {
                spawnPoint: { x: 230, y: 500 },
                worldBounds: { width: 5000, height: 800 },
                settings: {
                    music: "levelMusic",
                    cameraSpeed: 50,
                    autoScroll: true,
                },
            };
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
            try {
                levelData.createBackground(this.scene, midPoint);
            } catch (error) {
                // Silent error handling
            }
        }

        // Create platforms
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
                    // Silent error handling
                }
            });
        }

        // Create jump pads
        if (levelData.jumpPads) {
            levelData.jumpPads.forEach(jumpPad => {
                try {
                    if (this.isSceneReady()) {
                        this.createJumpPadWithMirror(
                            jumpPad.x,
                            jumpPad.y,
                            jumpPad.texture || "jumpPad",
                            jumpPad.scaleX || 0.5,
                            jumpPad.scaleY || 0.5
                        );
                    } else {
                        // Queue for later creation
                        this.pendingJumpPads.push({
                            x: jumpPad.x,
                            y: jumpPad.y,
                            texture: jumpPad.texture || "jumpPad",
                            scaleX: jumpPad.scaleX || 0.5,
                            scaleY: jumpPad.scaleY || 0.5,
                        });
                    }
                } catch (error) {
                    // Silent error handling
                }
            });
        }

        // Create spikes
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
                        this.pendingSpikes.push({
                            x: spike.x,
                            y: spike.y,
                            texture: spike.texture || "spike",
                            scaleX: spike.scaleX || 1,
                            scaleY: spike.scaleY || 1,
                        });
                    }
                } catch (error) {
                    // Silent error handling
                }
            });
        }

        // Create portals
        if (levelData.portals) {
            levelData.portals.forEach(portal => {
                try {
                    if (this.isSceneReady()) {
                        this.createPortalWithMirror(
                            portal.x,
                            portal.y,
                            portal.texture || "portal",
                            portal.scaleX || 1,
                            portal.scaleY || 1
                        );
                    } else {
                        this.pendingPortals = this.pendingPortals || [];
                        this.pendingPortals.push({
                            x: portal.x,
                            y: portal.y,
                            texture: portal.texture || "portal",
                            scaleX: portal.scaleX || 1,
                            scaleY: portal.scaleY || 1,
                        });
                    }
                } catch (error) {
                    // Silent error handling
                }
            });
        }

        // Create walls
        if (levelData.walls) {
            levelData.portals.forEach(portal => {
                try {
                    if (this.isSceneReady()) {
                        this.createPortalWithMirror(
                            portal.x,
                            portal.y,
                            portal.texture || "wall",
                            portal.scaleX || 1,
                            portal.scaleY || 1
                        );
                    } else {
                        this.pendingPortals = this.pendingPortals || [];
                        this.pendingPortals.push({
                            x: portal.x,
                            y: portal.y,
                            texture: portal.texture || "wall",
                            scaleX: portal.scaleX || 1,
                            scaleY: portal.scaleY || 1,
                        });
                    }
                } catch (error) {
                    // Silent error handling
                }
            });
        }

        // Create finish line
        if (levelData.finish && this.isSceneReady()) {
            try {
                this.createFinishWithMirror(
                    levelData.finish.x,
                    levelData.finish.y,
                    levelData.finish.width || 100,
                    levelData.finish.height || 100
                );
            } catch (error) {
                // Silent error handling
                if (!this.isSceneReady()) {
                    this.pendingFinish = {
                        x: levelData.finish.x,
                        y: levelData.finish.y,
                        width: levelData.finish.width || 100,
                        height: levelData.finish.height || 100,
                    };
                }
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
                // Silent error handling
            }
        }

        const settings = levelData.settings || {};
        const levelSettings = {
            music: settings.music || "levelMusic",
            cameraSpeed: settings.cameraSpeed !== undefined ? settings.cameraSpeed : 50,
            autoScroll: settings.autoScroll !== undefined ? settings.autoScroll : true,
        };

        return {
            spawnPoint: levelData.spawnPoint || { x: 230, y: 500 },
            worldBounds: levelData.worldBounds || { width: 5000, height: 800 },
            settings: levelSettings,
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
    createJumpPadWithMirror(x, y, texture = "jumpPad", scaleX = 0.5, scaleY = 0.5) {
        if (!this.isSceneReady()) {
            this.pendingJumpPads.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        try {
            if (!this.scene.jumpPads) {
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

            // Set camera visibility
            if (this.scene.topCamera) this.scene.topCamera.ignore(mirrorJumpPad);
            if (this.scene.bottomCamera) this.scene.bottomCamera.ignore(jumpPad);

            return jumpPad;
        } catch (error) {
            return null;
        }
    }

    createSpikesWithMirror(x, y, texture = "spike", scaleX = 1, scaleY = 1) {
        if (!this.isSceneReady()) {
            this.pendingSpikes = this.pendingSpikes || [];
            this.pendingSpikes.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        // Make sure the scene and its physics system are valid
        if (!this.scene || !this.scene.add || !this.scene.physics) {
            return null;
        }

        const screenHeight = this.scene.scale ? this.scene.scale.height : 768;
        const midPoint = screenHeight / 2;

        try {
            // Ensure spike group exists
            if (!this.scene.spikeGroup) {
                this.scene.spikeGroup = this.scene.physics.add.staticGroup();
            }

            // Create the spike
            let spike = null;
            try {
                spike = this.scene.spikeGroup.create(x, y, texture);
                spike.setScale(scaleX, scaleY);
                if (spike.refreshBody) {
                    spike.refreshBody();
                }
            } catch (err) {
                return null;
            }

            // Create mirrored spike
            let mirrorSpike = null;
            try {
                mirrorSpike = this.scene.add
                    .image(x, screenHeight - y + midPoint, texture)
                    .setScale(scaleX, scaleY)
                    .setFlipY(true);
            } catch (err) {
                // Silent error handling
            }

            // Safely set camera visibility
            this.safelySetCameraVisibility(this.scene.topCamera, [mirrorSpike]);
            this.safelySetCameraVisibility(this.scene.bottomCamera, [spike]);

            return spike;
        } catch (error) {
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
                    // Silent error handling
                }
            }
        }
    }

    /**
     * Create a finish line with its mirrored version
     */
    createFinishWithMirror(x, y, width, height) {
        if (!this.isSceneReady()) {
            this.pendingFinish = { x, y, width, height };
            return null;
        }

        // Defensive check
        if (!this.scene || !this.scene.add || !this.scene.physics) {
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
                // Silent error handling
            }

            // Create visual indicators for top and bottom views
            let finishVisual = null;
            let mirrorFinishVisual = null;

            try {
                // Visual for finish line (top view)
                finishVisual = this.scene.add.rectangle(x, y, width, height, 0xff0000).setAlpha(0);
                this.scene.finishVisual = finishVisual;

                // Mirror finish line for bottom view
                mirrorFinishVisual = this.scene.add
                    .rectangle(x, screenHeight - y + midPoint, width, height, 0xff0000)
                    .setAlpha(0.6)
                    .setDepth(1);
                this.scene.mirrorFinishVisual = mirrorFinishVisual;
            } catch (err) {
                // Silent error handling
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
    getCurrentLevelId() {
        return this.currentLevel || "level1";
    }

    /**
     * Get moving platforms in the current level
     */
    getMovingPlatforms() {
        return this.movingPlatforms || [];
    }

    createPortalWithMirror(x, y, texture = "portal", scaleX = 1, scaleY = 1) {
        if (!this.isSceneReady()) {
            this.pendingPortals = this.pendingPortals || [];
            this.pendingPortals.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        try {
            if (!this.scene.portals) {
                this.scene.portals = this.scene.physics.add.staticGroup();
            }

            const portal = this.scene.portals.create(x, y, texture);
            portal.setScale(scaleX, scaleY);

            // Make sure the physics body is properly sized
            const portalWidth = portal.width * 0.8; // Use 80% of the width for better collision
            const portalHeight = portal.height * 0.8; // Use 80% of the height for better collision
            portal.body.setSize(portalWidth, portalHeight, true);
            portal.refreshBody();

            // Add a small animation to make the portal more visible
            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: portal,
                    scaleX: scaleX * 1.1,
                    scaleY: scaleY * 1.1,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut",
                });
            }

            // Create mirrored version for bottom view
            const mirrorPortal = this.scene.add
                .image(x, screenHeight - y + midPoint, texture)
                .setScale(scaleX, scaleY)
                .setFlipY(true);

            // Also animate the mirror portal
            if (this.scene.tweens) {
                this.scene.tweens.add({
                    targets: mirrorPortal,
                    scaleX: scaleX * 1.1,
                    scaleY: scaleY * 1.1,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut",
                });
            }

            // Set camera visibility
            if (this.scene.topCamera) this.scene.topCamera.ignore(mirrorPortal);
            if (this.scene.bottomCamera) this.scene.bottomCamera.ignore(portal);

            console.log("Portal created at", x, y, "with texture", texture);
            return portal;
        } catch (error) {
            console.error("Error creating portal:", error);
            return null;
        }
    }

    createWallWithMirror(x, y, texture = "wall", scaleX = 1, scaleY = 1) {
        if (!this.isSceneReady()) {
            this.pendingWalls = this.pendingWalls || [];
            this.pendingWalls.push({ x, y, texture, scaleX, scaleY });
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        try {
            if (!this.scene.wallGroup) {
                this.scene.wallGroup = this.scene.physics.add.staticGroup();
            }

            const wall = this.scene.wallGroup.create(x, y, texture);
            wall.setScale(scaleX, scaleY);
            wall.refreshBody();

            // Create mirrored version for bottom view
            const mirrorWall = this.scene.add
                .image(x, screenHeight - y + midPoint, texture)
                .setScale(scaleX, scaleY)
                .setFlipY(true);

            // Set camera visibility
            if (this.scene.topCamera) this.scene.topCamera.ignore(mirrorWall);
            if (this.scene.bottomCamera) this.scene.bottomCamera.ignore(wall);

            return wall;
        } catch (error) {
            return null;
        }
    }
}
