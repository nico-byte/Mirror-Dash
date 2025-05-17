import { Scene } from 'phaser';

export class FinishLevel extends Scene {
    constructor() {
        super('FinishLevel');
    }

    create(data) {
        // Force camera to a solid background color (red)
        this.cameras.main.setBackgroundColor(0xff0000);

        const { width, height } = this.scale;

        // Add a full-screen semi-transparent overlay
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
        const time = data?.timeLeft ?? 0; // timeLeft should be in seconds
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.add.text(width / 2, 300, `Time Left: ${formattedTime}`, {
            fontFamily: 'Arial',
            fontSize: 40,
            color: '#ffffff'
        }).setOrigin(0.5);

        // Star Rating Logic
        let stars = 0;

        // Adjust these thresholds as per your needs
        if (time > 150) { // 3 stars if time left is greater than 2:30 (150 seconds)
            stars = 3;
        } else if (time > 120) { // 2 stars if time left is greater than 2:00 (120 seconds)
            stars = 2;
        } else if (time > 60) { // 1 star if time left is greater than 1:00 (60 seconds)
            stars = 1;
        }

        // Debug: Log the time and star count
        console.log(`Time left: ${time}, Stars: ${stars}`);

        // Ensure stars are visible even if none are set (handle 0 case)
        if (stars === 0) {
            stars = 1; // Default to 1 star if no stars were assigned
        }

        // Display Stars (use image if available or placeholder text)
        const starSpacing = 60;
        const startX = width / 2 - ((stars - 1) * starSpacing) / 2;

        for (let i = 0; i < stars; i++) {
            // Placeholder with Unicode star if image not available
            this.add.text(startX + i * starSpacing, 400, '★', {
                fontFamily: 'Arial',
                fontSize: 48,
                color: '#ffd700'
            }).setOrigin(0.5);
        }

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