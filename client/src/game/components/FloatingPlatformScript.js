export default class FloatingPlatformScript {
	constructor(gameObject) {
		this.gameObject = gameObject;
		gameObject.scene.events.once("update", this.start, this);
	}

	start() {
		const obj = this.gameObject;

		// Physik-Sicherheit (auch falls vom Editor nicht gesetzt)
		obj.setImmovable(true);
		if (obj.body) obj.body.allowGravity = false;

		// Tween: auf/ab bewegen
		obj.scene.tweens.add({
			targets: obj,
			y: obj.y - 100,     // Höhe der Bewegung
			duration: 2000,
			yoyo: true,
			repeat: -1,
			ease: "Sine.inOut"
		});
	}
}
