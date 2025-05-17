/**
 * Level 2 configuration
 * This level introduces new mechanics and a more complex layout
 */
export const Level2 = {
    name: "Level 2",
    description: "A more challenging level with moving platforms and obstacles",

    // Player spawn position
    spawnPoint: { x: 150, y: 300 },

    // World boundaries
    worldBounds: {
        width: 6000,
        height: 1000,
    },

    // Background creation function
    createBackground: (scene, midPoint) => {
        // Create background container (for top view)
        scene.backgroundContainer = scene.add.container(0, 0);

        // Add parallax background layers with a different arrangement than Level 1
        const bg1 = scene.add.image(0, 0, "bg5").setOrigin(0, 0);
        const bg2 = scene.add.image(720, 0, "bg3").setOrigin(0, 0);
        const bg3 = scene.add.image(1440, 0, "bg1").setOrigin(0, 0).setFlipX(true);
        const bg4 = scene.add.image(2160, 0, "bg4").setOrigin(0, 0);
        const bg5 = scene.add.image(2880, 0, "bg2").setOrigin(0, 0);
        const bgExtra = scene.add.image(3600, 0, "bg3").setOrigin(0, 0).setFlipX(true);
        const bgExtra2 = scene.add.image(4320, 0, "bg1").setOrigin(0, 0);
        const bgExtra3 = scene.add.image(5040, 0, "bg5").setOrigin(0, 0);

        scene.backgroundContainer.add([bg1, bg2, bg3, bg4, bg5, bgExtra, bgExtra2, bgExtra3]);

        // Create mirrored background for bottom view
        scene.mirrorBackgroundContainer = scene.add.container(0, midPoint);

        // Create mirrored background images (flipped vertically)
        const mirrorBg1 = scene.add.image(0, 0, "bg5").setOrigin(0, 0).setFlipY(true);
        const mirrorBg2 = scene.add.image(720, 0, "bg3").setOrigin(0, 0).setFlipY(true);
        const mirrorBg3 = scene.add.image(1440, 0, "bg1").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBg4 = scene.add.image(2160, 0, "bg4").setOrigin(0, 0).setFlipY(true);
        const mirrorBg5 = scene.add.image(2880, 0, "bg2").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra = scene.add.image(3600, 0, "bg3").setOrigin(0, 0).setFlipX(true).setFlipY(true);
        const mirrorBgExtra2 = scene.add.image(4320, 0, "bg1").setOrigin(0, 0).setFlipY(true);
        const mirrorBgExtra3 = scene.add.image(5040, 0, "bg5").setOrigin(0, 0).setFlipY(true);

        scene.mirrorBackgroundContainer.add([
            mirrorBg1,
            mirrorBg2,
            mirrorBg3,
            mirrorBg4,
            mirrorBg5,
            mirrorBgExtra,
            mirrorBgExtra2,
            mirrorBgExtra3,
        ]);

        // Set camera visibility for backgrounds
        if (scene.bottomCamera) scene.bottomCamera.ignore(scene.backgroundContainer);
        if (scene.topCamera) scene.topCamera.ignore(scene.mirrorBackgroundContainer);
    },

    // Platform configurations with different pattern than Level 1
    platforms: [
        // Starting area
        { x: 150, y: 400, texture: "platform_4x1", scaleX: 1.2, scaleY: 1.4 },

        // First jumping challenge
        { x: 450, y: 450, texture: "platform_3x1", scaleY: 1.4 },
        { x: 700, y: 500, texture: "platform_3x1", scaleX: 0.5, scaleY: 1.4 },

        // Moving platform section
        { x: 950, y: 450, texture: "platform_3x1", scaleY: 1.4, isStatic: false, movement: { y: 80, duration: 2000 } }, // This will be animated

        // Ascending platforms
        { x: 1200, y: 500, texture: "platform_4x1", scaleY: 1.4 },
        { x: 1450, y: 450, texture: "platform_3x1", scaleY: 1.4 },
        { x: 1700, y: 400, texture: "platform_4x1", scaleX: 0.8, scaleY: 1.4 },
        { x: 1950, y: 350, texture: "platform_3x1", scaleY: 1.4 },

        // Floating platform challenge
        {
            x: 2200,
            y: 300,
            texture: "platform_3x1",
            scaleY: 1.4,
            isStatic: false,
            movement: { y: 120, duration: 3000 },
        },
        { x: 2500, y: 250, texture: "platform_3x1", scaleY: 1.4 },

        // Long jump section
        { x: 2900, y: 300, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 3300, y: 350, texture: "platform_3x1", scaleY: 1.4 },

        // Final platforms
        { x: 3600, y: 400, texture: "platform_4x1", scaleY: 1.4 },
        { x: 3900, y: 400, texture: "platform_3x1", scaleY: 1.4 },
        { x: 4200, y: 450, texture: "platform_4x1", scaleX: 0.8, scaleY: 1.4 },

        // Final platform before finish
        { x: 4600, y: 400, texture: "platform_4x1", scaleX: 2, scaleY: 1.4 },
    ],

    // Jump pad configurations
    jumpPads: [
        { x: 450, y: 450, color: 0xff9900 }, // First jump boost
        { x: 1200, y: 500, color: 0xff9900 }, // Boost to reach higher platforms
        { x: 2900, y: 300, color: 0xff9900 }, // Boost for long jump
        { x: 3600, y: 400, color: 0xff9900 }, // Final section boost
    ],

    // Finish line configuration
    finish: {
        x: 4800,
        y: 350,
        width: 100,
        height: 100,
    },
};
