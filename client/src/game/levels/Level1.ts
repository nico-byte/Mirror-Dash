import { Level } from "./LevelManager"

/**
 * Level 1 configuration
 */
export const Level1: Level = {
    name: "Level 1",
    description: "The first level with platforms and jump pads",

    // Player spawn position
    spawnPoint: { x: 90, y: 700 },

    // World boundaries
    worldBounds: {
        width: 5040,
        height: 720,
    },

    settings: {
        music: "levelMusic", // Default music key
        cameraSpeed: 50, // Camera scroll speed
        autoScroll: true, // Whether camera auto-scrolls
    },

    // Platform configurations
    platforms: [
        { x: 85, y: 500, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 336, y: 570, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 606, y: 393, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 814, y: 565, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 996, y: 524, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1211, y: 493, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1434, y: 236, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1610, y: 416, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1764, y: 379, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },

        // Floating platform (vertical motion)
        {
            x: 1921,
            y: 345,
            texture: "platform_3x1",
            scaleX: 1.0,
            scaleY: 1.4,
            isStatic: false,
            motion: "vertical",
            range: -100,
            speed: 2000,
        },

        { x: 2069, y: 500, texture: "platform_4x1", scaleX: 0.5, scaleY: 1.4 },
        { x: 2433, y: 500, texture: "platform_4x1", scaleX: 3, scaleY: 1.4 },

        // New section
        { x: 2900, y: 270, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 3100, y: 420, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 3280, y: 370, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 3450, y: 330, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },

        // Sideways platform (horizontal motion)
        {
            x: 3750,
            y: 300,
            texture: "platform_3x1",
            scaleX: 1.0,
            scaleY: 1.4,
            isStatic: false,
            motion: "horizontal",
            range: 100,
            speed: 1600,
        },

        { x: 3900, y: 460, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 4250, y: 530, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 4550, y: 520, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
    ],

    // Jump pad configurations
    jumpPads: [
        { x: 380, y: 555, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 1250, y: 480, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 2650, y: 485, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
    ],

    // Spike configurations
    spikes: [
        { x: 2368, y: 480, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2368, y: 448, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2368, y: 416, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2400, y: 480, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2400, y: 448, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2400, y: 416, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2432, y: 480, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2432, y: 448, texture: "spike", scaleX: 1, scaleY: 1 },
        { x: 2432, y: 416, texture: "spike", scaleX: 1, scaleY: 1 },
    ],

    // Finish line configuration
    finish: {
        x: 4700,
        y: 440,
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
    }
};
