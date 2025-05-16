import { Socket } from 'socket.io-client'
export default class Menu extends Phaser.Scene {
    private nameInput!: HTMLInputElement
    private button!: HTMLButtonElement
    private socket!: Socket
    private appDiv: HTMLElement | null = null

    constructor() {
        super('Menu')
    }

    create() {
        const image = this.add.image(0, 0, 'intro')
        image.setOrigin(0, 0)
        image.setDisplaySize(
            this.sys.game.config.width,
            this.sys.game.config.height
        )

        this.socket = this.registry.get('socket')

        // Get existing app div
        this.appDiv = document.getElementById('app')

        // Create and style input
        this.nameInput = document.createElement('input')
        // center
        this.nameInput.style.position = 'absolute'
        this.nameInput.style.left = '50%'
        this.nameInput.style.top = '50%'
        this.nameInput.style.transform = 'translate(-50%, -130%)'
        this.nameInput.style.width = '50%'
        this.nameInput.style.textAlign = 'center'
        this.nameInput.style.backgroundColor = 'rgba(0, 0, 0, 0.0)'
        this.nameInput.style.border = 'none'
        this.nameInput.style.outline = 'none'
        this.nameInput.style.fontSize = '3vw'
        this.nameInput.maxLength = 20

        this.nameInput.placeholder = 'Enter your name'
        this.nameInput.onkeyup = (e) => {
            if (e.key == 'Enter') {
                this.joinGame()
            }
        }

        // Create and style button
        this.button = document.createElement('button')
        this.button.style.position = 'absolute'
        this.button.style.left = '50%'
        this.button.style.top = '50%'
        this.button.style.transform = 'translate(-50%, 10%)'
        this.button.style.width = '40%'
        this.button.style.height = '30%'
        this.button.style.opacity = '0.0'
        this.button.onclick = () => this.joinGame()

        // Append elements to app div
        this.appDiv?.appendChild(this.nameInput)
        this.appDiv?.appendChild(this.button)
        this.nameInput.focus()
    }

    private joinGame() {
        const playerName = this.nameInput.value.trim()

        // Check if username is empty
        if (!playerName) {
            alert('Please enter a username!')
            return
        }

        if(playerName.length > 20) {
            alert('Username cannot be longer than 20 characters!')
            return
        }

        // Check if game is already running by checking number of players in gameState
        this.socket.emit('checkGameState', {}, (gameStarted: boolean) => {
            if (gameStarted) {
                alert(
                    'A game is already in progress. Please wait until it ends.'
                )
                return
            }

            if (this.appDiv) {
                this.appDiv.removeChild(this.nameInput)
                this.appDiv.removeChild(this.button)
            }

            // If all checks pass, start the game
            this.registry.set('playerName', playerName)
            this.scene.start('Level', {
                socket: this.socket,
            })
        })
    }
}
