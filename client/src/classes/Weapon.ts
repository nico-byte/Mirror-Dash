import Phaser from 'phaser'
import { Enemy } from './Enemy'
import { Socket } from 'socket.io-client'
import { Player } from './Player'

export class Weapon {
    private scene: Phaser.Scene
    private player: Player
    private mousePointer: Phaser.Input.Pointer
    private hitBox: Phaser.GameObjects.Sprite
    private isAttacking: boolean = false
    private attackCooldown: number = 500
    private lastAttackTime: number = 0
    private damage: number = 20
    private maxRange: number = 50
    private weaponSprite: Phaser.GameObjects.Sprite
    private weaponOffsetX: number = 15
    private weaponOffsetY: number = 3
    private socket: Socket
    private isAnimating: boolean = false

    constructor(
        scene: Phaser.Scene,
        player: Player,
        mousePointer: Phaser.Input.Pointer,
        weaponSpriteName: string
    ) {
        this.scene = scene
        this.player = player
        this.mousePointer = mousePointer
        this.socket = this.scene.registry.get('socket')

        // Create weapon sprite
        this.weaponSprite = scene.add.sprite(0, 0, weaponSpriteName)
        this.weaponSprite.setScale(1.2)
        this.weaponSprite.setOrigin(0.5, 0.8)
        this.weaponSprite.setDepth(1000)
        this.weaponSprite.angle = 90

        // this.hitBox = scene.add.rectangle(0, 0, 50, 30, 0xff0000, 0.2)
        // use asset singleBubble as hitbox
        this.hitBox = scene.add.sprite(0, 0, 'singleBubble')
        this.hitBox.setVisible(false)
        this.hitBox = scene.physics.add.existing(this.hitBox, false)

        // Update weapon position in game loop
        scene.events.on('update', () => this.updateWeaponPosition())
    }

    private updateWeaponPosition(): void {
        if (this.isAnimating) return

        const player: any = this.player
        const mouseAngle = Phaser.Math.Angle.Between(
            player.x,
            player.y,
            this.mousePointer.worldX,
            this.mousePointer.worldY
        )

        this.weaponSprite.angle = Phaser.Math.RadToDeg(mouseAngle) + 90

        // Update position
        this.weaponSprite.x = player.x + this.weaponOffsetX
        this.weaponSprite.y = player.y - this.weaponOffsetY
    }

    public attack(): void {
        const currentTime = this.scene.time.now
        const player: any = this.player

        if (currentTime - this.lastAttackTime < this.attackCooldown) {
            return
        }

        this.isAnimating = true
        const originalX = player.x + this.weaponOffsetX
        const originalY = player.y - this.weaponOffsetY

        const mouseAngle = Phaser.Math.Angle.Between(
            player.x,
            player.y,
            this.mousePointer.worldX,
            this.mousePointer.worldY
        )

        // Hitbox visible for 500ms
        this.hitBox.setVisible(true)
        this.hitBox.setAlpha(1)
        this.scene.time.delayedCall(500, () => {
            this.hitBox.setVisible(false)
        })

        const attackSprite = this.scene.add.sprite(
            originalX,
            originalY,
            this.weaponSprite.texture.key
        )
        attackSprite.angle = Phaser.Math.RadToDeg(mouseAngle) + 90

        // Hide original sprite
        this.weaponSprite.setVisible(false)

        if (this.scene) {
            this.scene.tweens.add({
                targets: attackSprite,
                x: originalX + Math.cos(mouseAngle) * 30,
                y: originalY + Math.sin(mouseAngle) * 30,
                angle: Phaser.Math.RadToDeg(mouseAngle) + 90,
                // scaleY: 1.4,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    attackSprite.destroy()

                    this.weaponSprite.setVisible(true)
                    this.isAnimating = false
                },
            })
        }

        this.isAttacking = true
        this.lastAttackTime = currentTime

        // Calculate attack position
        const distance = Math.min(
            Phaser.Math.Distance.Between(
                player.x,
                player.y,
                this.mousePointer.worldX,
                this.mousePointer.worldY
            ),
            this.maxRange
        )

        // Position hit box
        this.hitBox.x = player.x + Math.cos(mouseAngle) * distance
        this.hitBox.y = player.y + Math.sin(mouseAngle) * distance

        // Check for enemy collisions
        const enemies: Enemy[] = (this.scene as any).enemies || []
        enemies.forEach((enemy) => {
            if (
                Phaser.Geom.Intersects.RectangleToRectangle(
                    this.hitBox.getBounds(),
                    enemy.getBounds()
                )
            ) {
                this.damageEnemy(enemy)
                this.socket.emit('enemyGetDamage', {
                    enemyId: enemy.id,
                    damage: this.damage,
                    playerId: this.socket.id,
                })
            }
        })

        if (this.scene) {
            // Visual feedback
            this.scene.tweens.add({
                targets: this.hitBox,
                alpha: 0.5,
                duration: 200,
                yoyo: true,
                onComplete: () => {
                    this.isAttacking = false
                },
            })
        }
    }

    private damageEnemy(enemy: Enemy): void {
        enemy.getDamage(this.damage)

        if (enemy.health - this.damage <= 0) {
            this.player.coins = this.player.coins + 10
            this.scene.updateCoins(this.player.coins)
        }
    }

    public isCurrentlyAttacking(): boolean {
        return this.isAttacking
    }
}
