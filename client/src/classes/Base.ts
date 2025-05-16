import { Actor } from './Actor'
export class Base extends Actor {
    private life: number = 100
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'guapen')
        // PHYSICS
        this.getBody().setSize(30, 30)
        this.getBody().setOffset(8, 0)
    }
    update(time: number, delta: number): void {
        if (this.life <= 0) {
            return
        }

        this.life -= (delta / 1000) * 30
        // console.log("Base life: " + this.life);
        // destroy the base if life is less than 0
        if (this.life <= 0) {
            this.destroy()
        }
    }
}
