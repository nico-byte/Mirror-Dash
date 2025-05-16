import { Scene } from "phaser";

export class Boot extends Scene {
    constructor() {
        super("Boot");
    }

    preload() {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image("background", "assets/bg.png");

        // Load Matter.js physics library
        this.load.script("matter", "https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js");
    }

    create() {
        // Check if Matter was loaded properly
        if (window.Matter) {
            console.log("Matter.js loaded successfully");
        } else {
            console.error("Failed to load Matter.js");
        }

        this.scene.start("Preloader");
    }
}
