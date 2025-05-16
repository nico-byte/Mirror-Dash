export interface Player {
    id: string;
    name: string;
    x: number;
    y: number;
    direction?: number;
    animation?: string;
}

export interface GameState {
    gameStarted: boolean;
    players: Record<string, Player>;
}
