import { Game } from "@/game/scenes/Game";
import { WASDKeys } from "@/game/utils/interfaces";

interface InputSetupResult {
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd: WASDKeys;
}

export class GameInput {
    scene: Game;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    wasd: WASDKeys | null;

    constructor(scene: Game) {
        this.scene = scene;
        this.init();
    }

    private init(): void {
        this.cursors = null;
        this.wasd = null;
    }

    setupInputs(): InputSetupResult {
        // Setup arrow keys
        this.cursors = this.scene.input.keyboard?.createCursorKeys() || null;

        // Setup WASD keys with null checking
        if (this.scene.input.keyboard) {
            this.wasd = {
                W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
                Space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            };
        } else {
            this.wasd = null;
        }

        // Ensure we have valid inputs before returning
        if (!this.cursors || !this.wasd) {
            throw new Error("Failed to initialize keyboard inputs");
        }

        return {
            cursors: this.cursors,
            wasd: this.wasd,
        };
    }

    destroy(): void {
        this.cursors = null;
        this.wasd = null;
    }
}