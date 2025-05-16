import { Actor } from './Actor'
import { WeaponManager } from './WeaponManager'
import { Weapon } from './Weapon'
import { Gun } from './Gun'
import { Socket } from 'socket.io-client'

export class Player extends Actor {
    private readonly MOVEMENT_SPEED = 180
    private readonly MAX_SPEED = 160
    private readonly DRAG = 800
    private readonly DASH_COOLDOWN = 1000 // ms
    private readonly DASH_SPEED_MULTIPLIER = 3 // Multiplier for dash speed
    private readonly DASH_DURATION = 200 // ms

    private keyW: Phaser.Input.Keyboard.Key
    private keyA: Phaser.Input.Keyboard.Key
    private keyS: Phaser.Input.Keyboard.Key
    private keyD: Phaser.Input.Keyboard.Key
    private keyShift: Phaser.Input.Keyboard.Key

    private readonly playerName: string
    public label: Phaser.GameObjects.Text
    public healthBar: Phaser.GameObjects.Text
    private socket: Socket
    private weapon: Weapon
    private weaponManager: WeaponManager
    private lastHealthUpdateTime: number = 0
    public coins: number = 30

    // Dash-related properties
    private lastDashTime: number = 0
    private isDashing: boolean = false
    private dashEndTime: number = 0
    private dashDirection: { x: number; y: number } = { x: 0, y: 0 }
    private isLocalPlayer: boolean

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        socket: Socket,
        playerName: string,
        isLocalPlayer: boolean = true
    ) {
        super(scene, x, y, 'player')
        this.socket = socket
        this.playerName = playerName
        this.isLocalPlayer = isLocalPlayer

        if (this.isLocalPlayer) {
            // KEYS
            this.keyW = this.scene.input.keyboard.addKey('W')
            this.keyA = this.scene.input.keyboard.addKey('A')
            this.keyS = this.scene.input.keyboard.addKey('S')
            this.keyD = this.scene.input.keyboard.addKey('D')
            this.keyShift = this.scene.input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.SHIFT
            )

            this.weaponManager = new WeaponManager(scene, this, socket)
            // Weapon
            this.weapon = new Weapon(
                scene,
                this,
                Phaser.Input.Pointer,
                'dreizack'
            )
        }

        // PHYSICS
        this.getBody().setSize(30, 30)
        this.getBody().setOffset(8, 0)
        this.getBody().setDrag(this.DRAG, this.DRAG)

        this.label = scene.add.text(x - 16, y - 80, this.playerName, {
            color: '#9de1f6',
            fontStyle: 'bold',
        })
        this.label.setDepth(1000)
        this.healthBar = scene.add.text(
            x - 30,
            y - 60,
            this.health.toString() + '% Air'
        )
        this.healthBar.setDepth(1000)
    }

    private performDash(time: number): void {
        // Determine dash direction based on current movement
        let dashX = 0
        let dashY = 0

        if (this.keyW.isDown) dashY -= 1
        if (this.keyS.isDown) dashY += 1
        if (this.keyA.isDown) dashX -= 1
        if (this.keyD.isDown) dashX += 1

        // If no movement keys are pressed, use last movement direction
        if (dashX === 0 && dashY === 0) {
            dashX = this.dashDirection.x
            dashY = this.dashDirection.y
        }

        // Normalize diagonal movement
        const length = Math.sqrt(dashX * dashX + dashY * dashY)
        if (length > 0) {
            dashX /= length
            dashY /= length
        }

        // Apply dash
        this.body.velocity.x =
            dashX * this.MOVEMENT_SPEED * this.DASH_SPEED_MULTIPLIER
        this.body.velocity.y =
            dashY * this.MOVEMENT_SPEED * this.DASH_SPEED_MULTIPLIER

        // Set dash state
        this.isDashing = true
        this.dashEndTime = time + this.DASH_DURATION
        this.lastDashTime = time
        this.dashDirection = { x: dashX, y: dashY }

        // Emit dash event if using socket
        this.socket.emit('playerDash', {
            x: this.x,
            y: this.y,
            dashX: dashX,
            dashY: dashY,
        })
    }

    updateHealth(time: number, delta: number): void {
        if (this.scene.gameStarted) {
            if (time - this.lastHealthUpdateTime > 400) {
                if (
                    this.x >= 90 &&
                    this.x <= 210 &&
                    this.y >= 60 &&
                    this.y <= 180
                ) {
                    if (this.health < 95) {
                        this.health += 5
                        this.socket.emit('playerHealthUpdate', {
                            health: this.health,
                        })
                    } else {
                        this.health = 100
                        this.socket.emit('playerHealthUpdate', {
                            health: this.health,
                        })
                    }
                } else {
                    if (this.health > 0) {
                        this.health -= 1
                        this.socket.emit('playerHealthUpdate', {
                            health: this.health,
                        })
                    } else {
                        this.scene.input.keyboard.enabled = false
                        this.body.velocity.x = 0
                        this.body.velocity.y = 0

                        let allDied = true

                        if (this.scene.otherPlayers) {
                            this.scene.otherPlayers.forEach((player) => {
                                if (player.health > 0) {
                                    allDied = false
                                }
                            })
                        }

                        if (allDied) {
                            this.socket.emit('gameOver')
                            this.scene.scene.start('GameOver')
                        }
                    }
                }

                this.healthBar.text = this.health.toString() + '% Air'
                this.lastHealthUpdateTime = time
            }
        }
    }

    update(time: number, delta: number): void {
        // Only update local player controls
        if (this.isLocalPlayer) {
            this.updateAnimation()
            this.updateHealth(time, delta)

            // Dash logic
            if (
                this.keyShift.isDown &&
                time - this.lastDashTime > this.DASH_COOLDOWN &&
                (this.keyW.isDown ||
                    this.keyA.isDown ||
                    this.keyS.isDown ||
                    this.keyD.isDown)
            ) {
                this.performDash(time)
            }

            // End dash if duration is over
            if (this.isDashing && time >= this.dashEndTime) {
                this.isDashing = false
                // Optionally reduce velocity after dash
                this.body.velocity.x *= 0.5
                this.body.velocity.y *= 0.5
            }

            // Regular movement controls (only if not dashing)
            if (!this.isDashing && this.scene.input.keyboard.enabled) {
                if (this.keyW?.isDown) {
                    this.body.velocity.y = -this.MOVEMENT_SPEED
                }
                if (this.keyA?.isDown) {
                    this.body.velocity.x = -this.MOVEMENT_SPEED
                    this.checkFlip()
                    this.getBody().setOffset(48, 15)
                }
                if (this.keyS?.isDown) {
                    this.body.velocity.y = this.MOVEMENT_SPEED
                }
                if (this.keyD?.isDown) {
                    this.body.velocity.x = this.MOVEMENT_SPEED
                    this.checkFlip()
                    this.getBody().setOffset(15, 15)
                }
            }
        }

        const labelWidth = this.label.width
        this.label.setPosition(this.x - labelWidth / 2, this.y - 80)
        this.healthBar.setPosition(this.x - 30, this.y - 60)

        if (this.body.velocity.x !== 0 || this.body.velocity.y !== 0) {
            this.socket.emit('playerUpdate', {
                x: this.x,
                y: this.y,
                direction: this.scaleX,
                animation: this.anims.currentAnim?.key,
            })
        }
    }

    public getWeapon(): Weapon {
        return this.weapon
    }
    public getCurrentWeapon(): Weapon | Gun | undefined {
        return this.weaponManager.getCurrentWeapon()
    }
}
