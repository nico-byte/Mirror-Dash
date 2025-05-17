/**
 * LevelManager class to handle loading and rendering different game levels
 */
export class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.currentLevel = null;
        this.levels = {};
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
     * Load a specific level
     * @param {string} key - The identifier of the level to load
     * @returns {object} The created level objects
     */
    loadLevel(key) {
        if (!this.levels[key]) {
            console.error(`Level "${key}" not found!`);
            return null;
        }

        this.currentLevel = key;
        const levelData = this.levels[key];

        // Calculate screen dimensions for mirroring
        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create physics groups if they don't exist
        if (!this.scene.platforms) {
            this.scene.platforms = this.scene.physics.add.staticGroup();
        }

        if (!this.scene.jumpPads) {
            this.scene.jumpPads = this.scene.physics.add.staticGroup();
        }

        // Create background if provided
        if (levelData.createBackground) {
            levelData.createBackground(this.scene, midPoint);
        }

        // Create platforms
        levelData.platforms.forEach(platform => {
            this.createPlatformWithMirror(
                platform.x,
                platform.y,
                platform.texture,
                platform.scaleX || 1,
                platform.scaleY || 1,
                platform.isStatic !== false // Default to static if not specified
            );
        });

        // Create jump pads
        if (levelData.jumpPads) {
            levelData.jumpPads.forEach(jumpPad => {
                this.createJumpPadWithMirror(jumpPad.x, jumpPad.y, jumpPad.color || 0xffff00);
            });
        }

        // Create finish line
        if (levelData.finish) {
            this.createFinishWithMirror(
                levelData.finish.x,
                levelData.finish.y,
                levelData.finish.width || 100,
                levelData.finish.height || 100
            );
        }

        // Set world and camera bounds
        const worldWidth = levelData.worldBounds?.width || 5000;
        const worldHeight = levelData.worldBounds?.height || 800;
        this.scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        if (this.scene.topCamera) {
            this.scene.topCamera.setBounds(0, 0, worldWidth, worldHeight);
        }

        if (this.scene.bottomCamera) {
            this.scene.bottomCamera.setBounds(0, 0, worldWidth, worldHeight);
        }

        console.log(`Level "${key}" loaded successfully`);

        return {
            spawnPoint: levelData.spawnPoint || { x: 230, y: 500 },
            worldBounds: { width: worldWidth, height: worldHeight },
        };
    }

    /**
     * Create a platform with its mirrored version
     */
    createPlatformWithMirror(x, y, texture, scaleX = 1, scaleY = 1, isStatic = true) {
        if (!this.scene || !this.scene.sys) {
            console.error("Scene or scene.sys is not initialized! Cannot create platform.");
            return { platform: null, mirrorPlatform: null };
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

        // Create the platform
        let platform;

        try {
            if (isStatic) {
                if (!this.scene.platforms) {
                    console.error("Platforms group is not initialized!");
                    this.scene.platforms = this.scene.physics.add.staticGroup();
                }

                platform = this.scene.platforms.create(x, y, texture);

                if (platform) {
                    platform.setScale(scaleX, scaleY);

                    if (platform.body) {
                        platform.body.moves = false;
                        platform.body.allowGravity = false;
                        platform.body.immovable = true;
                        platform.refreshBody();
                    } else {
                        console.warn("Platform body is undefined - physics may not work correctly");
                    }
                }
            } else {
                if (!this.scene.physics) {
                    console.error("Physics system is not initialized!");
                    return { platform: null, mirrorPlatform: null };
                }

                platform = this.scene.physics.add.image(x, y, texture);

                if (platform) {
                    platform.setScale(scaleX, scaleY);

                    if (platform.body) {
                        platform.body.allowGravity = false;
                        platform.body.immovable = true;
                    } else {
                        console.warn("Non-static platform body is undefined - physics may not work correctly");
                    }
                }
            }

            let mirrorPlatform = null;
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
     * Create a jump pad with its mirrored version
     */
    createJumpPadWithMirror(x, y, color) {
        if (!this.scene || !this.scene.sys) {
            console.error("Scene or scene.sys is not initialized! Cannot create jump pad.");
            return null;
        }

        const screenHeight = this.scene.scale.height;
        const midPoint = screenHeight / 2;

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
    }

    /**
     * Create a finish line with its mirrored version
     */
    createFinishWithMirror(x, y, width, height) {
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
