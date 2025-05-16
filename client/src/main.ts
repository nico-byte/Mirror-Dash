import Phaser from 'phaser'
import Level from './scenes/Level'
import Menu from './scenes/Menu'
import GameOver from './scenes/GameOver'
import Preload from './scenes/Preload'
import io from 'socket.io-client'
import type { Socket } from 'socket.io-client'

class Boot extends Phaser.Scene {
    private socket!: Socket

    constructor() {
        super('Boot')
    }

    preload() {
        this.load.pack('pack', 'assets/preload-asset-pack.json')
        this.createServerConnection()
    }

    createServerConnection() {
        if (location.hostname === 'localhost') {
            this.socket = io('http://localhost:9000')
        } else {
            this.socket = io('116.203.15.40:9000')
        }

        this.socket.on('connect', () => {
            this.registry.set('socket', this.socket)
            this.scene.start('Preload')
        })

        this.socket.on('disconnect', () => {
            alert('Server is down, please (re)start the server + F5!')
        })

        this.registry.set('socket', this.socket)
    }

    create() {}
}

window.addEventListener('load', function () {
    const game = new Phaser.Game({
        width: 1280,
        height: 720,
        backgroundColor: '#2f2f2f',
        parent: 'game-container',
        scale: {
            mode: Phaser.Scale.ScaleModes.FIT,
            autoCenter: Phaser.Scale.Center.CENTER_BOTH,
        },
        scene: [Boot, Preload, Menu, Level, GameOver],
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0, x: 0 },
            },
        },
    })
    game.scene.start('Boot')
})
