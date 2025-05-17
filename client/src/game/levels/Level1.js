/**
 * Level 1 configuration
 * This level is based on the original level from Game.js
 */
export const Level1 = {
    name: "Level 1",
    description: "The first level with platforms and jump pads",

    // Player spawn position
    spawnPoint: { x: 230, y: 500 },

    // World boundaries
    worldBounds: {
        width: 5000,
        height: 800,
    },

    // Background creation function
    createBackground: (scene, midPoint) => {
        // Create background container (for top view)
        scene.backgroundContainer = scene.add.container(0, 0);

        // Add parallax background layers
        const bg4 = scene.add.image(0, 0, "bg4").setOrigin(0, 0);
        const bg2 = scene.add.image(720, -1, "bg2").setOrigin(0, 0);
        const bg3 = scene.add.image(1440, 0, "bg3").setOrigin(0, 0).setFlipX(true);
        const bg5 = scene.add.image(2160, 0, "bg5").setOrigin(0, 0);
        const bg1 = scene.add.image(2880, 0, "bg1").setOrigin(0, 0);
        const bgExtra = scene.add.image(3600, 0, "bg2").setOrigin(0, 0);
        const bgExtra2 = scene.add.image(4320, 0, "bg3").setOrigin(0, 0).setFlipX(true);

        scene.backgroundContainer.add([bg4, bg2, bg3, bg5, bg1, bgExtra, bgExtra2]);

        // Create mirrored background for bottom view
        scene.mirrorBackgroundContainer = scene.add.container(0, midPoint);

        // Create mirrored background images (flipped vertically)
        const mirrorBg4 = scene.add.image(0, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBg2 = scene.add.image(720, -1, "bg2").setOrigin(0, 0).setFlipY(true);
        const mirrorBg3 = scene.add.image(1440, 0, "bg3").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBg5 = scene.add.image(2160, 0, "bg5").setOrigin(0, 0).setFlipY(true);
        const mirrorBg1 = scene.add.image(2880, 0, "bg1").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra = scene.add.image(3600, 0, "bg2").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra2 = scene.add.image(4320, 0, "bg3").setOrigin(0, 0).setFlipX(true).setFlipY(true);

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
        // Floating platform (animated in Game.js)
        { x: 1921, y: 345, texture: "platform_3x1", scaleY: 1.4, isStatic: false },
        { x: 2069, y: 500, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 2633, y: 500, texture: "platform_4x1", scaleX: 5, scaleY: 1.4 },
    ],

    // Jump pad configurations
    jumpPads: [
        { x: 320, y: 570, color: 0xffff00 },
        { x: 700, y: 580, color: 0xffff00 },
        { x: 1100, y: 520, color: 0xffff00 },
    ],

    // Finish line configuration
    finish: {
        x: 2900,
        y: 450,
        width: 100,
        height: 100,
    },
};
