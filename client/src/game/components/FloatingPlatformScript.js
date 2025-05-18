export default class FloatingPlatformScript {
    constructor(gameObject, scene) {
        this.gameObject = gameObject;
        this.scene = scene;
        this.awake();
    }

    init(gameObject, scene) {
        this.gameObject = gameObject;
        this.scene = scene;
        this.awake();
    }

    awake() {
        this.scene.tweens.add({
            targets: this.gameObject,
            y: this.gameObject.y - 80,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
