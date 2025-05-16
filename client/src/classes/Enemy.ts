import { Actor } from './Actor'
import { Bubble } from './Bubble'
import { Player } from './Player'

export class Enemy extends Actor {
    private actorToFollow: Actor
    private speed: number = 100
    private bubbles: Bubble[]
    private players: Player[]
    private isDying: boolean = false
    public health: number
    public id: string
    private attackCooldown: number = 1000
    private dmgAgainstBubble: number = 2
    private dmgAgainstPlayer: number = 5
    private findNewTargetCooldown: number = 1000
    private enemyAnimType: number = 1

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        bubbles: Bubble[],
        players: Player[],
        id: string
    ) {
        super(scene, x, y, 'enemy_1')
        // PHYSICS
        this.getBody().setSize(10, 10)
        this.getBody().setOffset(8, 0)
        this.scale = 1.5
        this.health = 100 // Override default health from Actor
        this.id = id

        this.bubbles = bubbles
        this.players = players
        // Select next target
        this.selectNewTarget()

        this.enemyAnimType = Phaser.Math.Between(1, 6)
    }

    update(time: number, delta: number): void {
        // Stop moving if dying
        if (this.isDying) return

        if (this.actorToFollow === undefined) {
            this.selectNewTarget()
            // No new bubble found, do nothing
            if (this.actorToFollow === undefined) {
                return
            }
        }

        // reduce find new target cooldown
        this.findNewTargetCooldown -= delta
        if (this.findNewTargetCooldown <= 0) {
            this.selectNewTarget()
            this.findNewTargetCooldown = 1000
        }

        // reduce attack cooldown
        this.attackCooldown -= delta
        if (
            Math.abs(this.x - this.actorToFollow.x) < 10 &&
            Math.abs(this.y - this.actorToFollow.y) < 10
        ) {
            if (this.attackCooldown <= 0) {
                // We do different damage against the bubble and the player
                if (this.actorToFollow instanceof Bubble) {
                    this.actorToFollow.getDamage(this.dmgAgainstBubble)
                } else if (this.actorToFollow instanceof Player) {
                    this.actorToFollow.getDamage(this.dmgAgainstPlayer)
                }

                this.attackCooldown = 1000
            }
        }

        // Move towards target if distance is greater than 10
        // Makes the enemy "wiggle" a bit when close to the target and attacking
        if (
            Phaser.Math.Distance.Between(
                this.x,
                this.y,
                this.actorToFollow.x,
                this.actorToFollow.y
            ) > 10
        ) {
            this.scene.physics.moveTo(
                this,
                this.actorToFollow.x,
                this.actorToFollow.y,
                this.speed
            )
        }

        //check if the enemy is close to the bubble
        if (
            Phaser.Math.Distance.Between(
                this.x,
                this.y,
                this.actorToFollow.x,
                this.actorToFollow.y
            ) < 20
        ) {
            this.anims.play('enemy_' + this.enemyAnimType + '_attack', true)
        } else {
            this.checkFlip()
            this.anims.play('enemy_' + this.enemyAnimType + '_walk', true)
        }
    }

    selectNewTarget(): void {
        // Calculate the nearest enemy or bubble to follow it
        let nearestBubble: Bubble
        let nearestBubbleDistance: number = 999999
        let nearestPlayer: Player
        let nearestPlayerDistance: number = 999999

        for (let bubble of this.bubbles) {
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                bubble.x,
                bubble.y
            )
            if (distance < nearestBubbleDistance) {
                nearestBubble = bubble
                nearestBubbleDistance = distance
            }
        }

        for (let player of this.players) {
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                player.x,
                player.y
            )
            if (distance < nearestPlayerDistance) {
                nearestPlayer = player
                nearestPlayerDistance = distance
            }
        }

        // Safety check
        if (nearestBubble === undefined && nearestPlayer === undefined) {
            return
        }

        if (nearestBubbleDistance < nearestPlayerDistance) {
            this.actorToFollow = nearestBubble
        } else {
            this.actorToFollow = nearestPlayer
        }
    }

    protected checkFlip(): void {
        if (this.body.velocity.x < 0) {
            this.scaleX = -1
        } else {
            this.scaleX = 1
        }
    }

    override getDamage(value?: number): void {
        if (this.isDying) return

        super.getDamage(value)

        // Optional: Flash red when hit
        this.scene.time.delayedCall(100, () => {
            this.clearTint()
        })
    }

    public die(): void {
        this.isDying = true

        if (this.scene) {
            // Death animation
            this.scene.tweens.add({
                targets: this,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    // Remove from scene and enemies array

                    if (this.scene && (this.scene as any).enemies) {
                        const index = (this.scene as any).enemies.indexOf(this)
                        if (index > -1) {
                            ;(this.scene as any).enemies.splice(index, 1)
                        }
                    }
                    this.destroy()
                },
            })
        }
    }
}
