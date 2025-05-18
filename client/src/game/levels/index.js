/**
 * Levels module index
 * Exports all level-related classes and configurations
 */

import { LevelManager } from "./LevelManager.js";
import { Level1 } from "./Level1.js";
import { Level2 } from "./Level2.js";
import { Level3 } from "./level3.js";
//import { Level4 } from "./Level4.js";
//import { Level5 } from "./Level5.js";

// Export individual levels
export { Level1, Level2, Level3};

// Export the LevelManager class
export { LevelManager };

// A collection of all available levels
export const Levels = {
    Level1,
    Level2,
    Level3,
    //Level4,
    //Level5,
};

/**
 * Create and initialize a level manager with all available levels
 * @param {Phaser.Scene} scene - The Phaser scene to attach the level manager to
 * @returns {LevelManager} The initialized level manager
 */
export function createLevelManager(scene) {
    const levelManager = new LevelManager(scene);

    // Register all available levels
    levelManager.registerLevel("level1", Level1);
    levelManager.registerLevel("level2", Level2);
    levelManager.registerLevel("level3", Level3);
    //levelManager.registerLevel("level4", Level4);
    //levelManager.registerLevel("level5", Level5);

    return levelManager;
}
