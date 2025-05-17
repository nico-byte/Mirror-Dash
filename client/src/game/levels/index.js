/**
 * Levels module index
 * Exports all level-related classes and configurations
 */

import { LevelManager } from "./LevelManager.js";
import { Level1 } from "./Level1.js";

// Export individual levels
export { Level1 };

// Export the LevelManager class
export { LevelManager };

// A collection of all available levels
export const Levels = {
    Level1,
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

    return levelManager;
}
