import Phaser from 'phaser'

export default class GameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOver' })
    }

    create() {
        // Game Over text
        const gameOverText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            '｡˚○ GAME OVER ｡˚○',
            {
                fontSize: '64px',
                color: '#ffffff',
                fontStyle: 'bold',
            }
        )
        gameOverText.setOrigin(0.5)

        this.add
            .text(
                this.cameras.main.centerX,
                this.cameras.main.centerY - 20,
                'Game created with ❤️ by Milka, DerMaddin, kinimodmeyer, AKManiac & SH4CK3R',
                {
                    fontSize: '14px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                }
            )
            .setOrigin(0.5)

        this.add
            .text(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 10,
                'Map assets - finalbossblues / ' +
                'Fish assets - craftpix.net / ' +
                'Main menu image (AI generated)',
                {
                    fontSize: '11px',
                    color: '#ffffff',
                    fontStyle: 'bold',
                }
            )
            .setOrigin(0.5)

        // Create button background
        const buttonWidth = 200
        const buttonHeight = 50
        const buttonX = this.cameras.main.centerX - buttonWidth / 2
        const buttonY = this.cameras.main.centerY + 50

        const buttonBg = this.add.rectangle(
            buttonX + buttonWidth / 2,
            buttonY + buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            0x444444
        )
        buttonBg.setInteractive()

        // Add button text
        const buttonText = this.add.text(
            buttonX + buttonWidth / 2,
            buttonY + buttonHeight / 2,
            'RESTART',
            {
                fontSize: '32px',
                color: '#ffffff',
            }
        )
        buttonText.setOrigin(0.5)

        // Button interactions
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x666666)
        })

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x444444)
        })

        buttonBg.on('pointerdown', () => {
            // this.scene.start('Menu')
            // reload the game
            window.location.reload()
        })
    }
}
