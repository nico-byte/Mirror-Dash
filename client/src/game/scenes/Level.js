
// You can write more code here

/* START OF COMPILED CODE */

class Level extends Phaser.Scene {

	constructor() {
		super("Level");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// backgroundcontainer
		const backgroundcontainer = this.add.container(0, 0);

		// bg4
		const bg4 = this.add.image(0, 0, "bg4");
		bg4.setOrigin(0, 0);
		backgroundcontainer.add(bg4);

		// bg2
		const bg2 = this.add.image(720, -1, "bg2");
		bg2.setOrigin(0, 0);
		backgroundcontainer.add(bg2);

		// bg3
		const bg3 = this.add.image(1440, 0, "bg3");
		bg3.setOrigin(0, 0);
		bg3.flipX = true;
		backgroundcontainer.add(bg3);

		// bg5
		const bg5 = this.add.image(2160, 0, "bg5");
		bg5.setOrigin(0, 0);
		backgroundcontainer.add(bg5);

		// bg1
		const bg1 = this.add.image(2880, 0, "bg1");
		bg1.setOrigin(0, 0);
		backgroundcontainer.add(bg1);

		// bg
		const bg = this.add.image(3600, 0, "bg2");
		bg.setOrigin(0, 0);
		backgroundcontainer.add(bg);

		// bg_1
		const bg_1 = this.add.image(4320, 0, "bg3");
		bg_1.setOrigin(0, 0);
		bg_1.flipX = true;
		backgroundcontainer.add(bg_1);

		// platform_4x1
		const platform_4x1 = this.physics.add.staticImage(85, 500, "platform_4x1");
		platform_4x1.scaleY = 1.4;
		platform_4x1.body.moves = false;
		platform_4x1.body.allowGravity = false;
		platform_4x1.body.immovable = true;
		platform_4x1.body.setSize(256, 64, false);

		// platform_3x1
		const platform_3x1 = this.physics.add.staticImage(336, 570, "platform_3x1");
		platform_3x1.scaleY = 1.4;
		platform_3x1.body.moves = false;
		platform_3x1.body.allowGravity = false;
		platform_3x1.body.immovable = true;
		platform_3x1.body.setSize(192, 64, false);

		// platform_4x
		const platform_4x = this.physics.add.staticImage(606, 593, "platform_4x1");
		platform_4x.scaleY = 1.4;
		platform_4x.body.moves = false;
		platform_4x.body.allowGravity = false;
		platform_4x.body.immovable = true;
		platform_4x.body.setSize(256, 64, false);

		// platform_4x_1
		const platform_4x_1 = this.physics.add.staticImage(814, 565, "platform_4x1");
		platform_4x_1.scaleX = 0.5;
		platform_4x_1.scaleY = 1.4;
		platform_4x_1.body.moves = false;
		platform_4x_1.body.allowGravity = false;
		platform_4x_1.body.immovable = true;
		platform_4x_1.body.setSize(128, 64, false);

		// lists
		const platforms = [platform_4x1, platform_3x1];

		this.platforms = platforms;

		this.events.emit("scene-awake");
	}

	/** @type {Phaser.Physics.Arcade.Image[]} */
	platforms;

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
