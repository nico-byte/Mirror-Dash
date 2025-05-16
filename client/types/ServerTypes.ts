export interface Player {
    id: string
    name: string
    x: number
    y: number
    direction?: number
    health: number
    animation?: string
}

export interface Enemy {
    id: string
    x: number
    y: number
    health: number
    pathArray: number[][]
}

export interface Bubble {
    id: string
    x: number
    y: number
    health: number
    pathArray: number[][]
}

export interface Tower {
    x: number
    y: number
    type: string
}

export interface MapData {
    enemySpawnPoints: number[][]
    enemyPath: number[][]
    bubbleSpawnPoint: number[]
    bubblePath: number[][]
}

export interface GameState {
    gameStarted: boolean
    wave: number
    players: Record<string, Player>
    enemies: Record<string, Enemy>
    bubbles: Record<string, Bubble>
    towers: Record<string, Tower>
    mapData: MapData
}
