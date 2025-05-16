import { Socket } from 'socket.io-client'
import { Weapon } from './Weapon'
import { Gun } from './Gun'

export class WeaponManager {
    private scene: Phaser.Scene
    private player: Phaser.GameObjects.GameObject
    private socket: Socket
    private weapons: Map<string, Weapon | Gun> = new Map()
    private currentWeapon: string = 'melee'
    private mousePointer: Phaser.Input.Pointer
    private weaponIndicator: Phaser.GameObjects.Text
    private lastGunAttackTime: number = 0
    private readonly GUN_COOLDOWN: number = 500

    constructor(
        scene: Phaser.Scene,
        player: Phaser.GameObjects.GameObject,
        socket: Socket
    ) {
        this.scene = scene
        this.player = player
        this.socket = socket
        this.mousePointer = scene.input.activePointer

        // Initialize weapons with trident asset
        this.weapons.set(
            'melee',
            new Weapon(scene, player, this.mousePointer, 'dreizack')
        )
        this.weapons.set(
            'gun',
            new Gun(scene, player, this.mousePointer, 'dreizack')
        )

        // Weapon indicator
        this.weaponIndicator = scene.add
            .text(530, 563, 'Weapon: Melee', {
                fontSize: '11px',
                color: '#ffffff',
            })
            .setScrollFactor(0)
            .setDepth(1500)

        this.setupWeaponSwitching()
        this.setupAttackInput()
    }

    private setupWeaponSwitching() {
        this.scene.input.keyboard.on('keydown-ONE', () =>
            this.switchToWeapon('melee')
        )
        this.scene.input.keyboard.on('keydown-TWO', () =>
            this.switchToWeapon('gun')
        )

        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                this.switchToWeapon('melee')
            } else {
                this.switchToWeapon('gun')
            }
        })
    }

    private setupAttackInput() {
        this.scene.input.on('pointerdown', this.attack, this)
    }

    private attack() {
        // Check if this is the local player's attack
        if (this.scene.registry.get('socket').id === this.socket.id) {
            const currentWeapon = this.getCurrentWeapon()
            currentWeapon?.attack()

            const currentTime = this.scene.time.now
            if (
                this.currentWeapon === 'gun' &&
                currentTime - this.lastGunAttackTime < this.GUN_COOLDOWN
            ) {
                return
            }

            // Update last attack time for gun
            if (this.currentWeapon === 'gun') {
                this.lastGunAttackTime = currentTime
            }

            this.socket.emit('playerAttack', {
                weaponType: this.currentWeapon === 'melee' ? 'melee' : 'gun',
                x: (this.player as any).x,
                y: (this.player as any).y,
                angle: Phaser.Math.Angle.Between(
                    (this.player as any).x,
                    (this.player as any).y,
                    this.mousePointer.worldX,
                    this.mousePointer.worldY
                ),
            })
        }
    }

    private switchToWeapon(weaponKey: string) {
        if (this.weapons.has(weaponKey)) {
            this.currentWeapon = weaponKey
            this.weaponIndicator.setText(
                `Weapon: ${weaponKey === 'melee' ? 'Melee' : 'Ranged'}`
            )
        }
    }

    public getCurrentWeapon(): Weapon | Gun | undefined {
        return this.weapons.get(this.currentWeapon)
    }
}
