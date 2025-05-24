import { Level } from "./LevelManager"

/**
 * Level 2 configuration
 */
export const Level2: Level = {
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
        { x: 100, y: 500, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 400, y: 450, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 700, y: 400, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1000, y: 350, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 1400, y: 300, texture: "platform_4x1", scaleX: 1.0,scaleY: 1.4 },
        { x: 1800, y: 300, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
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
        { x: 3000, y: 260, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 3400, y: 300, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 3800, y: 320, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 4200, y: 340, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 4700, y: 400, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 5200, y: 450, texture: "platform_3x1", scaleX: 1.0, scaleY: 1.4 },
        { x: 5400, y: 500, texture: "platform_4x1", scaleX: 1.0, scaleY: 1.4 },
    ],

    jumpPads: [
        { x: 380, y: 435, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 960, y: 335, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
        { x: 2200, y: 265, texture: "jumpPad", scaleX: 0.5, scaleY: 0.5 },
    ],

    spikes: [
        { x: 1200, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 1232, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 1264, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 1296, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 1328, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 2400, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 2432, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 2464, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 2496, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 2528, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 3570, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 3602, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 3634, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 3666, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 4400, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 4432, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 4464, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 5600, y: 470, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 5600, y: 438, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
        { x: 5600, y: 406, texture: "spike", scaleX: 1.0, scaleY: 1.0 },
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
    }
};
