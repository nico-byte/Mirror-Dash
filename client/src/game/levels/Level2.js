/**
 * Level 2 configuration
 */
export const Level2 = {
    name: "Level 2",
    description: "Advanced platforming challenges",

    // Player spawn position
    spawnPoint: { x: 100, y: 460 },

    worldBounds: {
        width: 6000,
        height: 720,
    },

    settings: {
        music: "levelMusic", // Default music key
        cameraSpeed: 50, // Camera scroll speed
        autoScroll: true, // Whether camera auto-scrolls
    },

    platforms: [
        { x: 100, y: 500, texture: "platform_4x1", scaleY: 1.4 },
        { x: 400, y: 450, texture: "platform_3x1", scaleY: 1.4 },
        { x: 700, y: 400, texture: "platform_4x1", scaleY: 1.4 },
        { x: 1000, y: 350, texture: "platform_3x1", scaleY: 1.4 },
        { x: 1400, y: 300, texture: "platform_4x1", scaleY: 1.4 },
        { x: 1800, y: 300, texture: "platform_3x1", scaleY: 1.4 },
        {
            x: 2400,
            y: 280,
            texture: "platform_3x1",
            scaleX: 1,
            scaleY: 1.4,
            isStatic: false,
            motion: "horizontal",
            range: 150, // ±150px Bewegung
            speed: 1800,
        },
        { x: 3000, y: 260, texture: "platform_4x1", scaleY: 1.4 },
        { x: 3400, y: 300, texture: "platform_3x1", scaleY: 1.4 },
        { x: 3800, y: 320, texture: "platform_4x1", scaleY: 1.4 },
        { x: 4200, y: 340, texture: "platform_3x1", scaleY: 1.4 },
        { x: 4700, y: 400, texture: "platform_4x1", scaleY: 1.4 },
        { x: 5200, y: 450, texture: "platform_3x1", scaleY: 1.4 },
        { x: 5400, y: 500, texture: "platform_4x1", scaleY: 1.4 },
    ],

    jumpPads: [
        { x: 380, y: 435, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 960, y: 335, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 2200, y: 265, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
    ],

    spikes: [
        { x: 1200, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1232, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1264, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1296, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1328, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2400, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2432, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2464, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2496, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2528, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3570, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3602, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3634, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3666, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 4400, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 4432, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 4464, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 5600, y: 470, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 5600, y: 438, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 5600, y: 406, texture: "spike", scaleX: 1, scaleY: 1 },
    ],

    finish: {
        x: 5800,
        y: 400,
        width: 100,
        height: 100,
    },

    // Background creation function
    createBackground: (scene, midPoint) => {
        // Create background container (for top view)
        scene.backgroundContainer = scene.add.container(0, 0);

        // Add parallax background layers
        const bg4 = scene.add.image(0, 0, "bg4").setOrigin(0, 0);
        const bg2 = scene.add.image(720, 0, "bg4").setOrigin(0, 0).setFlipX(true);
        const bg3 = scene.add.image(1440, 0, "bg4").setOrigin(0, 0);
        const bg5 = scene.add.image(2160, 0, "bg4").setOrigin(0, 0).setFlipX(true);
        const bg1 = scene.add.image(2880, 0, "bg4").setOrigin(0, 0);
        const bgExtra = scene.add.image(3600, 0, "bg4").setOrigin(0, 0).setFlipX(true);
        const bgExtra2 = scene.add.image(4320, 0, "bg4").setOrigin(0, 0);
        const bgExtra3 = scene.add.image(5040, 0, "bg4").setOrigin(0, 0).setFlipX(true);
        const bgExtra4 = scene.add.image(5760, 0, "bg4").setOrigin(0, 0);

        scene.backgroundContainer.add([bg4, bg2, bg3, bg5, bg1, bgExtra, bgExtra2, bgExtra3, bgExtra4]);

        // Create mirrored background for bottom view
        scene.mirrorBackgroundContainer = scene.add.container(0, midPoint);

        // Create mirrored background images (flipped vertically)
        const mirrorBg4 = scene.add.image(0, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBg2 = scene.add.image(720, 0, "bg4").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBg3 = scene.add.image(1440, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBg5 = scene.add.image(2160, 0, "bg4").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBg1 = scene.add.image(2880, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra = scene.add.image(3600, 0, "bg4").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBgExtra2 = scene.add.image(4320, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra3 = scene.add.image(5040, 0, "bg4").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBgExtra4 = scene.add.image(5760, 0, "bg4").setOrigin(0, 0).setFlipY(true);

        scene.mirrorBackgroundContainer.add([
            mirrorBg4,
            mirrorBg2,
            mirrorBg3,
            mirrorBg5,
            mirrorBg1,
            mirrorBgExtra,
            mirrorBgExtra2,
            mirrorBgExtra3,
            mirrorBgExtra4,
        ]);

        // Set camera visibility for backgrounds
        if (scene.bottomCamera) scene.bottomCamera.ignore(scene.backgroundContainer);
        if (scene.topCamera) scene.topCamera.ignore(scene.mirrorBackgroundContainer);
    },

    createPlatforms: scene => {
        scene.platformGroup = scene.add.group();

        for (const cfg of Level1.platforms) {
            const platform =
                cfg.isStatic !== false
                    ? scene.physics.add.staticImage(cfg.x, cfg.y, cfg.texture)
                    : scene.physics.add.image(cfg.x, cfg.y, cfg.texture);

            const scaleX = cfg.scaleX || 1;
            const scaleY = cfg.scaleY || 1.4;

            platform.setScale(scaleX, scaleY);
            platform.body.setAllowGravity(false);
            platform.body.immovable = true;

            // Shrink the collider size (80% width and 50% height of the original scaled size)
            const frame = scene.textures.get(cfg.texture).getSourceImage();
            const bodyWidth = frame.width * scaleX * 0.8;
            const bodyHeight = frame.height * scaleY * 0.2; // Give it proper height
            platform.body.setSize(bodyWidth, bodyHeight, true);

            if (platform.refreshBody) platform.refreshBody();

            scene.platformGroup.add(platform);

            if (!cfg.isStatic && cfg.motion) {
                const tweenConfig = {
                    targets: platform,
                    duration: cfg.speed || 2000,
                    repeat: -1,
                    yoyo: true,
                    ease: "Sine.easeInOut",
                };

                if (cfg.motion === "vertical") {
                    tweenConfig.y = cfg.y - (cfg.range || 80);
                } else if (cfg.motion === "horizontal") {
                    tweenConfig.x = cfg.x - (cfg.range || 80);
                }

                scene.tweens.add(tweenConfig);
            }
        }
    },

    setupMovingPlatforms: scene => {
        for (const platform of scene.platformGroup.getChildren()) {
            if (platform.body?.immovable === false) {
                const data = Level1.platforms.find(p => p.x === platform.x && p.y === platform.y);
                if (!data || !data.motion) continue;

                const tween = {
                    targets: platform,
                    duration: data.speed || 2000,
                    repeat: -1,
                    yoyo: true,
                    ease: "Sine.easeInOut",
                };

                if (data.motion === "vertical") tween.y = platform.y - (data.range || 80);
                else if (data.motion === "horizontal") tween.x = platform.x - (data.range || 80);

                scene.tweens.add(tween);
            }
        }
    },
};
