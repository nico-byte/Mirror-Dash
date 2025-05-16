import { Actor } from './Actor'
import { Socket } from 'socket.io-client'
export class Bubble extends Actor {
    private pathArray: number[][]
    private speed: number = 70
    public healthBar: Phaser.GameObjects.Text
    private socket: Socket

    constructor(
        scene: Phaser.Scene,
        bubbleStart: number[],
        pathArray: number[][],
        socket: Socket
    ) {
        super(scene, bubbleStart[0], bubbleStart[1], 'singleBubble')

        this.getBody().setCircle(16)
        this.scale = 2
        this.pathArray = pathArray
        this.healthBar = scene.add.text(
            bubbleStart[0] - 35,
            bubbleStart[1] - 60,
            this.health.toString() + '% Life'
        )
        this.socket = socket
    }

    public getDamage(value?: number): void {
        super.getDamage(value)

        this.health -= 1
        this.healthBar.text = this.health + '% Life'

        this.socket.emit('bubbleHealthUpdate', {
            health: this.health,
        })

        if (this.health <= 0) {
            this.socket.emit('gameOver')
            this.scene.scene.start('GameOver')
        }
    }

    update(time: number, delta: number): void {
        this.anims.play('bubble_idle', true)
        if (this.pathArray.length !== 0) {
            // move to pathArray[0]
            this.scene.physics.moveTo(
                this,
                this.pathArray[0][0],
                this.pathArray[0][1],
                this.speed
            )

            this.healthBar.setPosition(this.x - 35, this.y - 60)

            // if pathArray[0] is reached, within a 10 pixel range, remove it from pathArray, withour matter
            if (
                Math.abs(this.x - this.pathArray[0][0]) < 10 &&
                Math.abs(this.y - this.pathArray[0][1]) < 10
            ) {
                this.pathArray.shift()

                if (this.pathArray.length === 0) {
                    this.destroy()
                    this.healthBar.destroy()
                    this.socket.emit('waveCompleted')
                }
            }
        }
    }
}
