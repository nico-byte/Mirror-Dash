import { Server } from 'socket.io'
import { createServer } from 'http'
import { GameState, Player } from '../client/types/ServerTypes'

const httpServer = createServer()
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})

let gameState: GameState = {
    gameStarted: false,
    wave: 0,
    players: {},
    enemies: {},
    bubbles: {},
    towers: {},
    mapData: {
        enemySpawnPoints: [],
        enemyPath: [],
        bubbleSpawnPoint: [],
        bubblePath: [],
    },
}

let enemyCounter = 0
let enemySpawnerInterval
const enemySpawnInterval = 5000

function spawnBubble() {
    const bubbleStart = [
        gameState.mapData.bubbleSpawnPoint[0],
        gameState.mapData.bubbleSpawnPoint[1],
    ]
    // Define the path
    const path = [
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
    ]
    const bubble = {
        id: 'bubble1',
        x: bubbleStart[0],
        y: bubbleStart[1],
        pathArray: path,
        health: 100,
    }
    // todo: add bubble to gameState
    gameState.bubbles[bubble.id] = bubble
    io.emit('bubbleCreated', bubble)
}

function startEnemySpawner() {
    // Define map corners for spawning
    const mapCorners = [
        [50, 50], // Top left
        [50, 750], // Bottom left
        [1200, 50], // Top right
        [1200, 750], // Bottom right
    ]

    const playerMultiplier = Object.keys(gameState.players).length
    let enemySpawnInterval = 5000
    // Reduce the interval based on the wave count
    // gameState.wave = 1 -> 5000 * 0.8 = 4000
    // gameState.wave = 2 -> 5000 * 0.6 = 3000
    // gameState.wave = 3 -> 5000 * 0.4 = 2000
    // gameState.wave = 4 -> 5000 * 0.2 = 1000
    // gameState.wave = 5 -> 5000 * 0.1 = 500
    enemySpawnInterval = enemySpawnInterval * (1 - gameState.wave * 0.2)
    if (enemySpawnInterval < 500) {
        // minimum spawn interval
        enemySpawnInterval = 500
    }

    enemySpawnerInterval = setInterval(() => {
        // Spawn an enemy for each player
        for (let i = 0; i < playerMultiplier; i++) {
            enemyCounter++
            console.log('Spawning enemy', enemyCounter)

            // Select random corner
            const cornerIndex = Math.floor(Math.random() * mapCorners.length)
            const cornerPoint = mapCorners[cornerIndex]

            // Add small random offset (-20 to +20 pixels)
            const randomOffset = () => Math.random() * 40 - 20

            const spawnPoint = [
                Math.max(0, Math.min(1250, cornerPoint[0] + randomOffset())),
                Math.max(0, Math.min(800, cornerPoint[1] + randomOffset())),
            ]

            const enemy = {
                id: 'enemy_' + enemyCounter,
                x: spawnPoint[0],
                y: spawnPoint[1],
                health: 100,
                pathArray: [
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
            gameState.enemies[enemy.id] = enemy
            io.emit('enemyCreated', enemy)
        }
    }, enemySpawnInterval)
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('joinGame', ({ playerName }) => {
        const player: Player = {
            id: socket.id,
            name: playerName,
            x: 230,
            y: 250,
            health: 100,
            animation: 'idle',
        }

        // Add player to gameState
        gameState.players[socket.id] = player

        io.emit('gameState', gameState)
    })

    socket.on('playerUpdate', ({ x, y, direction, animation }) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].x = x
            gameState.players[socket.id].y = y
            gameState.players[socket.id].direction = direction
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                x,
                y,
                direction,
                animation,
            })
        }
    })

    socket.on('playerAttack', (attackData) => {
        socket.broadcast.emit('remotePlayerAttack', {
            playerId: socket.id,
            ...attackData,
        })
    })

    socket.on('gameOver', () => {
        gameState.gameStarted = false

        clearInterval(enemySpawnerInterval)
        enemyCounter = 0
        gameState = {
            gameStarted: false,
            wave: 0,
            players: {},
            enemies: {},
            bubbles: {},
            towers: {},
            mapData: {
                enemySpawnPoints: [],
                enemyPath: [],
                bubbleSpawnPoint: [],
                bubblePath: [],
            },
        }
    })

    socket.on('enemyMove', ({ enemyId, x, y }) => {
        if (gameState.enemies[enemyId]) {
            gameState.enemies[enemyId].x = x
            gameState.enemies[enemyId].y = y
            socket.broadcast.emit('enemyMoved', { enemyId, x, y })
        }
    })

    socket.on('waveCompleted', () => {
        gameState.gameStarted = false
        clearInterval(enemySpawnerInterval)
        io.emit('waveFinished', gameState.wave)
    })

    socket.on('enemyGetDamage', ({ enemyId, damage }) => {
        if (gameState.enemies[enemyId]) {
            gameState.enemies[enemyId].health =
                gameState.enemies[enemyId].health - damage
            if (gameState.enemies[enemyId].health <= 0) {
                delete gameState.enemies[enemyId]
                io.emit('enemyDied', { enemyId })
            }
        }
    })

    socket.on('bubbleHealthUpdate', ({ health }) => {
        if (gameState.bubbles['bubble1']) {
            gameState.bubbles['bubble1'].health = health
            socket.broadcast.emit('bubbleHealthUpdate', {
                id: 'bubble1',
                health,
            })
        }
    })

    socket.on('playerHealthUpdate', ({ health }) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].health = health
            socket.broadcast.emit('playerHealthUpdate', {
                id: socket.id,
                health,
            })
        }
    })

    socket.on('placeTower', (towerData) => {
        // Add tower to game state
        gameState.towers[towerData.serverId] = {
            x: towerData.x,
            y: towerData.y,
            type: towerData.type,
        }

        // Broadcast tower placement to other players
        socket.broadcast.emit('towerPlaced', towerData)
    })

    socket.on('checkGameState', (data, callback) => {
        callback(gameState.gameStarted)
    })

    socket.on('disconnect', () => {
        delete gameState.players[socket.id]
        io.emit('gameState', gameState)

        if (Object.keys(gameState.players).length == 0) {
            enemyCounter = 0
            clearInterval(enemySpawnerInterval)
            gameState = {
                gameStarted: false,
                wave: 0,
                players: {},
                enemies: {},
                bubbles: {},
                towers: {},
                mapData: {
                    enemySpawnPoints: [],
                    enemyPath: [],
                    bubbleSpawnPoint: [],
                    bubblePath: [],
                },
            }
        }
    })

    socket.on('startGame', ({ mapData }) => {
        if (!gameState.gameStarted) {
            gameState.gameStarted = true
            gameState.mapData.enemySpawnPoints = mapData.enemySpawnPoints
            gameState.mapData.enemyPath = mapData.enemyPath
            gameState.mapData.bubbleSpawnPoint = mapData.bubbleSpawnPoint
            gameState.mapData.bubblePath = mapData.bubblePath
            gameState.wave += 1
            spawnBubble()
            startEnemySpawner()
            io.emit('gameState', gameState)
            io.emit('disableStartButton')
        }
    })
})

const PORT = process.env.PORT || 9000
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
