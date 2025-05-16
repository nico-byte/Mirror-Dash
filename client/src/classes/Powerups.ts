import { Player } from "./Player";
import Phaser from "phaser";

export class Powerups {
    // adjusts speed of a Player by value over duration
    adjustSpeedPowerup(p: Player, value: number = 100, duration = 200): void {
        const originalSpeed = p['MOVEMENT_SPEED'];

        (p as any).MOVEMENT_SPEED = originalSpeed + value;

        setTimeout(() => {
            (p as any).MOVEMENT_SPEED = originalSpeed;
        }, duration);
    }

    changeCameraZoom(scene: Phaser.Scene,
        camera: Phaser.Cameras.Scene2D.Camera,
        zoomValue: number = 1,
        duration: number = 1000,
        ease: 'Sine.easeInOut'): void {

        scene.tweens.add({
            targets: camera, // Die Hauptkamera
            zoom: zoomValue,                  // Ziel-Zoom
            duration: duration,             // Dauer in Millisekunden (hier: 1 Sekunde)
            ease: ease     // Easing-Funktion für weichen Übergang
        });
    }
}