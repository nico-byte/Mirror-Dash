// FloatingPlatformScript.js

class FloatingPlatformScript extends ScriptNode {

    awake() {
        const platform = this.gameObject;

        this.scene.tweens.add({
            targets: platform,
            y: platform.y - 80,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}


