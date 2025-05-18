/**
 * Level 3 configuration
 */
export const Level4 = {
    name: "Level 4",
    description: "Height shifts, moving platforms, and floating spike hazards",

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
        { x: 100, y: 500, texture: "platform_3x1", scaleY: 1.4 },
        {
            x: 450,
            y: 400,
            texture: "platform_4x1",
            scaleY: 1.4,
            isStatic: false,
            motion: "vertical",
            range: 150, // ±150px Bewegung
            speed: 1800,
        },

        {
            x: 750,
            y: 350,
            texture: "platform_3x1",
            scaleY: 1.4,
            isStatic: false,
            motion: "horizontal",
            range: 150,
            speed: 1800,
        },

        {
            x: 1000,
            y: 500,
            texture: "platform_4x1",
            scaleY: 1.4,
            isStatic: false,
            motion: "vertical",
            range: 150, // ±150px Bewegung
            speed: 1800,
        },

        {
            x: 1300,
            y: 470,
            texture: "platform_3x1",
            scaleY: 1.4,
            isStatic: false,
            motion: "horizontal",
            range: 150,
            speed: 1800,
        },

        { x: 1600, y: 600, texture: "platform_4x1", scaleY: 1.4 },

        {
            x: 1780,
            y: 470,
            texture: "platform_3x1",
            scaleY: 1.4,
            isStatic: false,
            motion: "horizontal",
            range: 150,
            speed: 1800,
        },
        
        { x: 2200, y: 400, texture: "platform_4x1", scaleY: 1.4 },
        { x: 2500, y: 320, texture: "platform_3x1", scaleY: 1.4 },
        { x: 3200, y: 520, texture: "platform_4x1", scaleY: 1.4 },

     
    ],

    jumpPads: [{ x: 1670, y: 585, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 }],

    spikes: [
        { x: 450, y: 370, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 625, y: 425, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 750, y: 325, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 950, y: 400, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 980, y: 500, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1250, y: 380, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 1450, y: 420, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2100, y: 390, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2582, y: 192, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2624, y: 192, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2656, y: 224, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2688, y: 224, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2720, y: 224, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2752, y: 256, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2752, y: 256, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2784, y: 256, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2816, y: 288, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2848, y: 288, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2880, y: 288, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2912, y: 320, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2944, y: 320, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2976, y: 352, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3008, y: 352, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3040, y: 352, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3072, y: 384, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3104, y: 384, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 3136, y: 384, texture: "spike", scaleX: 1, scaleY: 1 },  
        { x: 3140, y: 392, texture: "spike", scaleX: 1, scaleY: 1 }  
        
    ],

    portals: [
        { x: 2582, y: 256, texture: "portal", scaleX: 1, scaleY: 1},
        { x: 3140, y: 456, texture: "portal", scaleX: 1, scaleY: 1}
    ],

    wall: [
        { x: 4382, y: 356, texture: "wall", scaleX: 1, scaleY: 1}
    ],

    finish: {
        x: 5900,
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
