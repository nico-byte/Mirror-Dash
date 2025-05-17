import { Scene } from 'phaser';

export class FinishLevel extends Scene {
    constructor() {
        super('FinishLevel');
    }

    create(data) {
        // Force camera to a solid background color (red)
        this.cameras.main.setBackgroundColor(0xff0000);

        // Add a full-screen semi-transparent overlay
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

        // Title Text
        this.add.text(width / 2, 200, 'Level Complete!', {
            fontFamily: 'Arial Black',
            fontSize: 64,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Remaining time
        const time = data?.timeLeft ?? 0;
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.add.text(width / 2, 300, `Time Left: ${formattedTime}`, {
            fontFamily: 'Arial',
            fontSize: 40,
            color: '#ffffff'
        }).setOrigin(0.5);

        // Continue instruction
        this.add.text(width / 2, 500, 'Click to return to Main Menu', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0.5);

        // Handle click to return
        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}