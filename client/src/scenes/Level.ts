// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
import { Base } from '../classes/Base'
import { Enemy } from '../classes/Enemy'
import { Player } from '../classes/Player'
import { Gun } from '../classes/Gun'
import { type Socket } from 'socket.io-client'
import type {
    GameState,
    Enemy as ServerEnemy,
    MapData as ServerMapData,
    Bubble as ServerBubble,
} from '../../types/ServerTypes'
import { Bubble } from '../classes/Bubble'
import { TowerManager } from '../classes/TowerManager'
/* END-USER-IMPORTS */

export default class Level extends Phaser.Scene {
    constructor() {
        super('Level')

        /* START-USER-CTR-CODE */
        // Write your code here.
        /* END-USER-CTR-CODE */
    }

    editorCreate(): void {
        // level1Map
        const level1Map = this.add.tilemap('BubbleNautsMapUpdated')
        level1Map.addTilesetImage('Decoration', 'decoration')
        level1Map.addTilesetImage('Bubbles', 'bubbles')
        level1Map.addTilesetImage('Player', 'player')
        level1Map.addTilesetImage('Environment', 'environment')

        // ground_1
        level1Map.createLayer('Ground', ['Environment', 'Decoration'], 0, 0)

        // floor_1
        level1Map.createLayer('Floor', ['Environment', 'Decoration'], 0, 0)

        // walls_1
        level1Map.createLayer('Walls', ['Environment'], 0, 0)

        // road_DecorationsFloor_1
        level1Map.createLayer('Road/DecorationsFloor', ['Environment'], 0, 0)

        // road_RoadBottom_1
        level1Map.createLayer('Road/RoadBottom', ['Decoration'], 0, 0)

        // road_RoadTop_1
        level1Map.createLayer(
            'Road/RoadTop',
            ['Environment', 'Decoration'],
            0,
            0
        )

        // baseDecorations_1
        level1Map.createLayer('BaseDecorations', [], 0, 0)

        // base_1
        level1Map.createLayer('Base', ['Environment', 'Decoration'], 0, 0)

        // grass_Grass_1
        const grass_Grass_1 = level1Map.createLayer(
            'Grass/Grass',
            ['Decoration'],
            0,
            0
        )!
        grass_Grass_1.visible = false

        // grass_Grass
        level1Map.createLayer('Grass/Grass2', ['Decoration'], 0, 0)

        // grass_Grass_2
        const grass_Grass_2 = level1Map.createLayer(
            'Grass/Grass3',
            ['Decoration'],
            0,
            0
        )!
        grass_Grass_2.visible = false

        // grass_Grass_3
        const grass_Grass_3 = level1Map.createLayer(
            'Grass/Grass4',
            ['Decoration'],
            0,
            0
        )!
        grass_Grass_3.visible = false

        // mapDecorations_Decorations_1
        level1Map.createLayer(
            'MapDecorations/Decorations',
            ['Decoration'],
            0,
            0
        )

        // mapDecorations_Decorations
        level1Map.createLayer(
            'MapDecorations/Decorations2',
            ['Decoration'],
            0,
            0
        )

        // mapDecorations_Decorations_2
        level1Map.createLayer(
            'MapDecorations/Decorations3',
            ['Decoration'],
            0,
            0
        )

        // objective_Objective_1
        level1Map.createLayer('Objective/Objective', ['Decoration'], 0, 0)

        // objective_ObjectiveDecorations_1
        level1Map.createLayer(
            'Objective/ObjectiveDecorations',
            ['Decoration'],
            0,
            0
        )

        // objective_ObjectiveDecorations
        level1Map.createLayer(
            'Objective/ObjectiveDecorations2',
            ['Decoration'],
            0,
            0
        )

        // waterLayer_1
        level1Map.createLayer('WaterLayer', ['Environment'], 0, 0)

        this.level1Map = level1Map

        this.events.emit('scene-awake')
    }

    private level1Map!: Phaser.Tilemaps.Tilemap

    /* START-USER-CODE */
    private player!: Player
    // enemies will be filled by the EnemySpawner
    private enemies: Enemy[] = []
    private bubbles: Bubble[] = []
    private socket!: Socket
    private base?: Base
    private otherPlayers: Map<string, Player> = new Map()
    private playername!: string
    private startGameButton!: Phaser.GameObjects.Image
    private waveNumber: number
    private waveText!: Phaser.GameObjects.Text
    private coinText!: Phaser.GameObjects.Text
    private mapData!: ServerMapData
    public gameStarted: boolean = false
    private towerManager: TowerManager

    create() {
        this.socket = this.registry.get('socket')
        this.playername = this.registry.get('playerName')
        this.editorCreate()

        this.waveNumber = 0

        // Pass socket to Player
        this.player = new Player(
            this,
            230,
            250,
            this.socket,
            this.playername,
            true
        )

        this.player.setDepth(1000)

        this.cameras.main.setBounds(
            0,
            0,
            this.level1Map.widthInPixels,
            this.level1Map.heightInPixels
        )

        const colliderBox = this.physics.add.staticGroup()
        const box1 = colliderBox.create(0, 0, null)
        const box2 = colliderBox.create(250, 0, null)
        box1.setSize(150, 340)
        box2.setSize(80, 340)
        box1.visible = false
        box2.visible = false

        const boundary = this.physics.add.staticGroup()
        boundary.create(0, 30, null).setSize(9999, 1).setVisible(false) // Top boundary
        boundary
            .create(0, this.level1Map.heightInPixels - 30, null)
            .setSize(9999, 1)
            .setVisible(false) // Bottom boundary
        boundary.create(0, 0, null).setSize(20, 9999).setVisible(false) // Left boundary
        boundary
            .create(9999, 0, null)
            .setSize(1, this.level1Map.heightInPixels - 30)
            .setVisible(false) // Right boundary

        this.physics.add.collider(this.player, boundary)

        this.physics.add.collider(this.player, colliderBox)

        this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
        this.cameras.main.setZoom(1.5)
        const interfaceimg = this.add.image(500, 600, 'interfaceimg')
        interfaceimg.setOrigin(0, 1)

        interfaceimg.setDisplaySize(260, 50)
        interfaceimg.setScrollFactor(0)
        interfaceimg.setDepth(1000)

        this.add
            .text(530, 585, 'Coins:', {
                fontSize: '11px',
                color: '#ffffff',
            })
            .setOrigin(0, 1)
            .setScrollFactor(0)
            .setDepth(1500)

        this.coinText = this.add
            .text(590, 585, this.player.coins.toString(), {
                fontSize: '11px',
                color: '#ffffff',
            })
            .setOrigin(0, 1)
            .setScrollFactor(0)
            .setDepth(1500)

        // A static button that can be used to send a message to the server
        this.startGameButton = this.add.image(320, 20, 'StartButtonRendered')
        this.startGameButton.setOrigin(0, 0)
        this.startGameButton.setDisplaySize(144, 48)
        this.startGameButton.setInteractive()
        this.startGameButton.setDepth(0)
        this.towerManager = new TowerManager(this, this.socket)

        // display fix wave number but with following camera
        this.add.text(325, 80, 'Wave: ', {
            fontSize: '21px',
            fill: 'white',
        })
        this.waveText = this.add.text(390, 80, this.waveNumber.toString(), {
            fontSize: '21px',
            fill: 'white',
        })

        // Füge text darunter hinzu mit anweisungen
        this.add.text(325, 110, 'Press "WASD" to move', {
            fontSize: '11px',
            fill: 'white',
        })
        this.add.text(325, 130, 'Press "Shift" to dash', {
            fontSize: '11px',
            fill: 'white',
        })
        this.add.text(325, 150, 'Click to shoot/attack', {
            fontSize: '11px',
            fill: 'white',
        })
        this.add.text(325, 170, 'Press "1" or "2" to switch weapon', {
            fontSize: '11px',
            fill: 'white',
        })
        this.add.text(325, 190, 'Regen air on open shell', {
            fontSize: '11px',
            fill: 'white',
        })

        const bubble1 = this.add.sprite(140, 80, 'bubbles')
        const bubble2 = this.add.sprite(195, 95, 'bubbles')

        bubble1.play('bubbles')
        bubble2.flipX = true
        bubble2.playAfterDelay('bubbles', 100)

        this.mapData = {
            enemySpawnPoints: [
                [1200, 100],
                [1200, 300],
                [1200, 500],
                [1200, 700],
            ],
            enemyPath: [
                [1200, 430],
                [1082, 430],
                [1082, 208],
                [820, 208],
                [820, 620],
                [975, 620],
                [955, 130],
                [615, 140],
                [590, 530],
                [180, 530],
                [160, 150],
            ],
            bubbleSpawnPoint: [1200, 100],
            bubblePath: [
                [1200, 430],
                [1082, 430],
                [1082, 208],
                [820, 208],
                [820, 620],
                [975, 620],
                [955, 130],
                [615, 140],
                [590, 530],
                [180, 530],
                [160, 150],
            ],
        }

        this.startGameButton.on('pointerdown', () => {
            this.startGameButton.alpha = 0.5
            this.startGameButton.disableInteractive()

            const mapData = this.mapData
            this.socket.emit('startGame', { mapData })
        })

        this.socket.on('disableStartButton', () => {
            this.startGameButton.alpha = 0.5
            this.startGameButton.disableInteractive()
        })

        this.socket.on('gameState', (gameState: GameState) => {
            this.otherPlayers.forEach((player) => player.destroy())
            this.otherPlayers.forEach((player) => player.label.destroy())
            this.otherPlayers.forEach((player) => player.healthBar.destroy())
            this.otherPlayers.clear()

            this.waveNumber = gameState.wave
            this.waveText.setText(this.waveNumber.toString())

            this.gameStarted = gameState.gameStarted

            // Create sprites for other players EXCEPT current player
            Object.values(gameState.players).forEach((player) => {
                if (player.id !== this.socket.id) {
                    const otherPlayer = new Player(
                        this,
                        player.x,
                        player.y,
                        this.socket,
                        player.name,
                        false // Mark as non-local player
                    )
                    this.otherPlayers.set(player.id, otherPlayer)
                }
            })
        })

        this.socket.on('waveFinished', (wave: number) => {
            this.gameStarted = false

            this.enemies.forEach((enemy) => enemy.destroy())
            this.enemies = []

            this.bubbles.forEach((bubble) => {
                bubble.healthBar.destroy()
                bubble.destroy()
            })

            this.bubbles = []

            this.waveNumber = wave
            this.waveText.setText(this.waveNumber.toString())

            this.player.health = 100
            this.input.keyboard.enabled = true

            const mapData = this.mapData
            this.socket.emit('startGame', { mapData })
        })

        this.socket.on('enemyDied', ({ enemyId }) => {
            const enemy = this.enemies.find((enemy) => enemy.id === enemyId)
            if (enemy) {
                enemy.die()
            }
        })

        this.socket.on('enemyCreated', (enemy: ServerEnemy) => {
            const players = Array.from(this.otherPlayers.values()) as Player[]
            players.push(this.player)
            const newEnemy = new Enemy(
                this,
                enemy.x,
                enemy.y,
                this.bubbles,
                players,
                enemy.id
            )

            this.enemies.push(newEnemy)
        })

        this.socket.on('bubbleCreated', (bubble: ServerBubble) => {
            this.bubbles = []
            const newBubble = new Bubble(
                this,
                [bubble.x, bubble.y],
                bubble.pathArray,
                this.socket
            )
            this.bubbles.push(newBubble)
        })

        this.socket.on(
            'playerHealthUpdate',
            (playerInfo: { id: string; health: number }) => {
                const otherPlayer = this.otherPlayers.get(playerInfo.id)
                if (otherPlayer) {
                    otherPlayer.health = playerInfo.health
                    otherPlayer.healthBar.text =
                        playerInfo.health.toString() + '% Air'
                }
            }
        )

        this.socket.on(
            'bubbleHealthUpdate',
            (bubbleInfo: { id: string; health: number }) => {
                const bubble = this.bubbles[0]
                if (bubble) {
                    bubble.healthBar.text =
                        bubbleInfo.health.toString() + '% Life'
                    bubble.health = bubbleInfo.health
                }
            }
        )

        // Listen for player movement updates
        this.socket.on(
            'playerMoved',
            (playerInfo: {
                id: string
                x: number
                y: number
                direction: number
                animation: string
            }) => {
                const otherPlayer = this.otherPlayers.get(playerInfo.id)
                if (otherPlayer) {
                    otherPlayer.setPosition(playerInfo.x, playerInfo.y)
                    otherPlayer.label.setPosition(
                        playerInfo.x - 16,
                        playerInfo.y - 80
                    )
                    otherPlayer.healthBar.setPosition(
                        playerInfo.x - 16,
                        playerInfo.y - 60
                    )
                    otherPlayer.scaleX = playerInfo.direction

                    // Play animation if different from current
                    if (
                        playerInfo.animation &&
                        otherPlayer.anims.currentAnim?.key !==
                            playerInfo.animation
                    ) {
                        otherPlayer.play(playerInfo.animation)
                    }
                }
            }
        )

        this.socket.on('remotePlayerAttack', (attackData) => {
            const otherPlayer = this.otherPlayers.get(attackData.playerId)
            if (otherPlayer) {
                if (attackData.weaponType === 'gun') {
                    const gunWeapon = new Gun(
                        this,
                        otherPlayer,
                        this.input.activePointer,
                        'dreizack',
                        true // Mark as remote weapon
                    )

                    gunWeapon.attack({
                        x: attackData.x,
                        y: attackData.y,
                        angle: attackData.angle,
                    })
                }
            }
        })

        this.socket.emit('joinGame', { playerName: this.playername })

        const graphics = this.add.graphics()
        graphics.lineStyle(3, 0xffffff, 1)
    }

    updateCoins(coins: number) {
        this.coinText.setText(coins.toString())
        this.player.coins = coins
    }

    getCoins() {
        return this.player.coins
    }

    update(time: number, delta: number): void {
        this.player.update(time, delta)
        this.base?.update(time, delta)
        this.enemies.forEach((enemy) => {
            enemy.update(time, delta)
        })
        this.bubbles.forEach((bubble) => {
            bubble.update(time, delta)
        })

        // Add tower manager update
        this.towerManager.update(time, this.enemies)
    }
}
/* END-USER-CODE */

/* END OF COMPILED CODE */

// You can write more code here
