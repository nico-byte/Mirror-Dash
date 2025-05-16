import Phaser from 'phaser'
import { Enemy } from './Enemy'
import { Socket } from 'socket.io-client'

interface TowerConfig {
    type: string
    cost: number
    damage: number
    fireRate: number
    range: number
}

export class Tower extends Phaser.GameObjects.Sprite {
    private target: Enemy | null = null
    private fireRate: number
    private damage: number
    private range: number
    private lastFired: number = 0
    private rangeCircle: Phaser.GameObjects.Graphics
    private socket: Socket

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        config: TowerConfig,
        socket: Socket
    ) {
        super(scene, x, y, texture)

        this.fireRate = config.fireRate
        this.damage = config.damage
        this.range = config.range
        this.socket = socket

        if (config.type == 'advanced') {
            this.tint = 0xff00ff
        }

        // Add to scene and enable physics
        scene.add.existing(this)
        scene.physics.add.existing(this)

        // Create range visualization
        this.rangeCircle = scene.add.graphics()
        this.rangeCircle.lineStyle(2, 0xffffff, 0.5)
        // this.rangeCircle.setScale(1.5)
        this.rangeCircle.strokeCircleShape(
            new Phaser.Geom.Circle(x, y, this.range)
        )
    }

    update(time: number, enemies: Enemy[]): void {
        // Find closest enemy within range
        this.findTarget(enemies)

        // Shoot if target exists and enough time has passed
        if (this.target && time - this.lastFired > this.fireRate) {
            this.shoot()
            this.lastFired = time
        }
    }

    private findTarget(enemies: Enemy[]): void {
        let closestEnemy: Enemy | null = null
        let closestDistance = Infinity

        for (const enemy of enemies) {
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                enemy.x,
                enemy.y
            )

            if (distance <= this.range && distance < closestDistance) {
                closestEnemy = enemy
                closestDistance = distance
            }
        }

        this.target = closestEnemy
    }

    private shoot(): void {
        if (!this.target) return

        // Basic projectile shooting logic
        // const projectile = this.scene.add.circle(this.x, this.y, 15, 0xdddddd)
        const projectile = this.scene.add.image(this.x, this.y, 'mine')

        this.scene.physics.add.existing(projectile)

        this.scene.physics.moveToObject(
            projectile,
            this.target,
            1000 // Projectile speed
        )

        // Destroy projectile on hit or after timeout
        this.scene.physics.add.overlap(projectile, this.target, () => {
            if (this.target instanceof Enemy) {
                this.target?.getDamage(this.damage)
                if (this.socket) {
                    this.socket.emit('enemyGetDamage', {
                        enemyId: this.target.id,
                        damage: this.damage,
                    })
                }
            }
            projectile.destroy()
        })

        // Timeout for projectile
        this.scene.time.delayedCall(1000, () => projectile.destroy(), [], this)
    }

    // Method to update range circle position
    updateRangeCircle(x: number, y: number): void {
        this.rangeCircle.clear()
        this.rangeCircle.lineStyle(2, 0xffffff, 0.5)
        this.rangeCircle.strokeCircleShape(
            new Phaser.Geom.Circle(x, y, this.range)
        )
    }
}

export class TowerManager {
    private scene: Phaser.Scene
    private socket: Socket
    private towerConfigs: Map<string, TowerConfig>
    private towers: Tower[] = []
    private selectedTowerType: string | null = null
    private currentDragTower: Phaser.GameObjects.Sprite | null = null
    private remoteTowers: Map<string, Tower> = new Map() // Track remote towers
    private playerCoins: number = 0

    constructor(scene: Phaser.Scene, socket: Socket) {
        this.scene = scene
        this.socket = socket

        // Define tower types
        this.towerConfigs = new Map([
            [
                'basic',
                {
                    type: 'basic',
                    cost: 50,
                    damage: 10,
                    fireRate: 500,
                    range: 100,
                },
            ],
            [
                'advanced',
                {
                    type: 'advanced',
                    cost: 100,
                    damage: 20,
                    fireRate: 300,
                    range: 150,
                },
            ],
        ])

        this.createTowerMenu()

        socket.on(
            'towerPlaced',
            (towerData: {
                x: number
                y: number
                type: string
                serverId: string
            }) => {
                this.placeRemoteTower(towerData)
            }
        )
    }

    private createTowerMenu(): void {
        const menuX = 660
        const menuY = 570
        let offset = 0

        this.towerConfigs.forEach((config, type) => {
            const towerSprite = this.scene.add
                .sprite(menuX + offset, menuY, `turret`)
                .setScrollFactor(0)
                .setDepth(1500)

            if (type == 'advanced') {
                towerSprite.tint = 0xff00ff
            }

            this.scene.add
                .text(menuX + offset + 13, menuY - 10, config.cost.toString())
                .setStyle({
                    color: 'gold',
                    fontFamily: 'arial',
                    fontSize: '11px',
                })
                .setScrollFactor(0)
                .setDepth(1500)

            offset += 50
            towerSprite.setInteractive()
            towerSprite.on('pointerdown', () => {
                const coins = this.scene.getCoins()

                const cost = config.cost || 0
                if (coins >= cost) {
                    this.selectTowerType(type)
                    this.scene.updateCoins(coins - cost)
                } else {
                    // Optional: Add feedback that player can't afford tower
                    console.log('Not enough coins for this tower')
                }
            })

            // this.towerMenu.add(towerSprite)
        })
    }

    private selectTowerType(type: string): void {
        this.selectedTowerType = type

        // Create a draggable preview tower
        if (this.currentDragTower) {
            this.currentDragTower.destroy()
        }

        this.currentDragTower = this.scene.add.sprite(
            this.scene.input.x,
            this.scene.input.y,
            `turret`
        )

        if (type == 'advanced') {
            this.currentDragTower.tint = 0xff00ff
        }

        this.scene.input.on('pointermove', this.updateDragTower, this)
        this.scene.input.on('pointerup', this.placeTower, this)
    }

    private updateDragTower(pointer: Phaser.Input.Pointer): void {
        if (this.currentDragTower) {
            // Get world coordinates considering camera scroll
            const worldPoint = this.scene.cameras.main.getWorldPoint(
                pointer.x,
                pointer.y
            )
            this.currentDragTower.setPosition(worldPoint.x, worldPoint.y)
        }
    }

    private placeTower(pointer: Phaser.Input.Pointer): void {
        if (!this.selectedTowerType || !this.currentDragTower) return

        const config = this.towerConfigs.get(this.selectedTowerType)
        if (!config) return

        const worldPoint = this.scene.cameras.main.getWorldPoint(
            pointer.x,
            pointer.y
        )
        const serverId = `tower_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`

        const tower = new Tower(
            this.scene,
            worldPoint.x,
            worldPoint.y,
            `turret`,
            config,
            this.socket
        )
        tower.setScale(1.5)

        this.towers.push(tower)

        // Emit tower placement with world coordinates
        this.socket.emit('placeTower', {
            x: worldPoint.x,
            y: worldPoint.y,
            type: this.selectedTowerType,
            serverId: serverId,
        })

        // Clean up drag state
        if (this.currentDragTower) {
            this.currentDragTower.destroy()
            this.currentDragTower = null
        }

        // Remove event listeners
        this.scene.input.off('pointermove', this.updateDragTower, this)
        this.scene.input.off('pointerup', this.placeTower, this)

        this.selectedTowerType = null
    }

    private placeRemoteTower(towerData: {
        x: number
        y: number
        type: string
        serverId: string
    }): void {
        const config = this.towerConfigs.get(towerData.type)
        if (!config) return

        // Check if tower already exists to prevent duplicates
        if (this.remoteTowers.has(towerData.serverId)) return

        const tower = new Tower(
            this.scene,
            towerData.x,
            towerData.y,
            `turret`,
            config
        )

        this.remoteTowers.set(towerData.serverId, tower)
    }

    update(time: number, enemies: Enemy[]): void {
        // Update all placed towers
        this.towers.forEach((tower) => tower.update(time, enemies))
        this.remoteTowers.forEach((tower) => tower.update(time, enemies))
    }
}
