/**
 * Level 1 configuration
 * This level is based on the original level from Game.js
 */
export const Level1 = {
    name: "Level 1",
    description: "The first level with platforms and jump pads",

    // Player spawn position
    spawnPoint: { x: 90, y: 500 },

    // World boundaries
    worldBounds: {
        width: 5040,
        height: 720,
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

        scene.backgroundContainer.add([bg4, bg2, bg3, bg5, bg1, bgExtra, bgExtra2]);

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

        scene.mirrorBackgroundContainer.add([
            mirrorBg4,
            mirrorBg2,
            mirrorBg3,
            mirrorBg5,
            mirrorBg1,
            mirrorBgExtra,
            mirrorBgExtra2,
        ]);

        // Set camera visibility for backgrounds
        if (scene.bottomCamera) scene.bottomCamera.ignore(scene.backgroundContainer);
        if (scene.topCamera) scene.topCamera.ignore(scene.mirrorBackgroundContainer);
    },

    createPlatforms: (scene) => {
        scene.platformGroup = scene.add.group();

        for (const cfg of Level1.platforms) {
            const platform = cfg.isStatic !== false
                ? scene.physics.add.staticImage(cfg.x, cfg.y, cfg.texture)
                : scene.physics.add.image(cfg.x, cfg.y, cfg.texture);

            platform.setScale(cfg.scaleX || 1, cfg.scaleY || 1.4);
            platform.body.setAllowGravity(false);
            platform.body.immovable = true;
            if (platform.refreshBody) platform.refreshBody();

            scene.platformGroup.add(platform);

            if (!cfg.isStatic && cfg.motion) {
                const tweenConfig = {
                    targets: platform,
                    duration: cfg.speed || 2000,
                    repeat: -1,
                    yoyo: true,
                    ease: "Sine.easeInOut"
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

    setupMovingPlatforms: (scene) => {
        for (const platform of scene.platformGroup.getChildren()) {
            if (platform.body?.immovable === false) {
                const data = Level1.platforms.find(p => p.x === platform.x && p.y === platform.y);
                if (!data || !data.motion) continue;

                const tween = {
                    targets: platform,
                    duration: data.speed || 2000,
                    repeat: -1,
                    yoyo: true,
                    ease: "Sine.easeInOut"
                };

                if (data.motion === "vertical") tween.y = platform.y - (data.range || 80);
                else if (data.motion === "horizontal") tween.x = platform.x - (data.range || 80);

                scene.tweens.add(tween);
            }
        }
    },

    // Platform configurations
    platforms: [
        { x: 85, y: 500, texture: "platform_4x1", scaleY: 1.4 },
        { x: 336, y: 570, texture: "platform_3x1", scaleY: 1.4 },
        { x: 606, y: 593, texture: "platform_4x1", scaleY: 1.4 },
        { x: 814, y: 565, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 996, y: 524, texture: "platform_3x1", scaleY: 1.4 },
        { x: 1211, y: 493, texture: "platform_4x1", scaleY: 1.4 },
        { x: 1434, y: 436, texture: "platform_4x1", scaleY: 1.4 },
        { x: 1610, y: 416, texture: "platform_3x1", scaleY: 1.4 },
        { x: 1764, y: 379, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },

         // Floating platform (vertical motion)
        { x: 1921, y: 345, texture: "platform_3x1", scaleY: 1.4, isStatic: false, motion: 'vertical', range: -100, speed: 2000 },

        { x: 2069 , y: 500, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 2433, y: 500, texture: "platform_4x1", scaleX: 3, scaleY: 1.4 },

        // New section
        { x: 2900, y: 470, texture: "platform_4x1", scaleY: 1.4 },
        { x: 3100, y: 420, texture: "platform_3x1", scaleY: 1.4 },
        { x: 3280, y: 370, texture: "platform_4x1", scaleY: 1.4 },
        { x: 3450, y: 330, texture: "platform_3x1", scaleY: 1.4 },

        // Sideways platform (horizontal motion)
        { x: 3750, y: 300, texture: "platform_3x1", scaleY: 1.4, isStatic: false, motion: 'horizontal', range: 100 , speed: 1600 },

        { x: 3900, y: 460, texture: "platform_4x1", scaleY: 1.4 },
        { x: 4250, y: 500, texture: "platform_4x1", scaleY: 1.4 },
        { x: 4550, y: 520, texture: "platform_3x1", scaleY: 1.4 },
    ],

    // Jump pad configurations
    jumpPads: [
        { x: 320, y: 570, color: 0xffff00 },
        { x: 700, y: 580, color: 0xffff00 },
        { x: 1100, y: 520, color: 0xffff00 },
        { x: 3050, y: 430, color: 0xff00ff },
        { x: 4100, y: 470, color: 0x00ffff },
    ],

    // Finish line configuration
    finish: {
        x: 4700,
        y: 440,
        width: 100,
        height: 100,
    },
};
