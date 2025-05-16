import { Physics } from 'phaser'
export class Actor extends Physics.Arcade.Sprite {
    public health = 100
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        frame?: string | number
    ) {
        super(scene, x, y, texture, frame)
        this.scene.add.existing(this)
        this.scene.physics.add.existing(this)
        this.getBody().setCollideWorldBounds(true)
    }

    public getDamage(value?: number): void {
        if (this.scene) {
            this.scene.tweens.add({
                targets: this,
                duration: 100,
                repeat: 3,
                yoyo: true,
                alpha: 0.5,
                onStart: () => {
                    if (value) {
                        if (this.health - value < 0) {
                            this.health = 0
                        } else {
                            this.health = this.health - value
                        }
                    }
                },
                onComplete: () => {
                    this.setAlpha(1)
                },
            })
        }
    }

    protected checkFlip(): void {
        if (this.body.velocity.x < 0) {
            this.scaleX = -1
        } else {
            this.scaleX = 1
        }
    }
    protected getBody(): Physics.Arcade.Body {
        return this.body as Physics.Arcade.Body
    }

    public updateAnimation(): void {
        const speed = Math.sqrt(
            this.body.velocity.x ** 2 + this.body.velocity.y ** 2
        )
        const animationState = speed > 0 ? 'walk' : 'idle'

        if (this.anims.currentAnim?.key !== animationState) {
            this.play(animationState)
        }
    }
}
