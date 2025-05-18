export class GameInput {
    constructor(scene) {
        this.scene = scene;
        this.cursors = null;
        this.wasd = null;
    }

    init(scene) {
        this.scene = scene;
        this.cursors = null;
        this.wasd = null;
    }

    setupInputs() {
        // Setup arrow keys
        this.cursors = this.scene.input.keyboard.createCursorKeys();

        // Setup WASD keys
        this.wasd = {
            W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            Space: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        };

        return {
            cursors: this.cursors,
            wasd: this.wasd,
        };
    }
}
