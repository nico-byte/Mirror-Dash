export class GameTimer {
    constructor(scene) {
        this.scene = scene;
        this.timeLeft = 180; // in seconds
        this.timerEvent = null;
        this.gameUI = null;
    }

    setGameUI(gameUI) {
        this.gameUI = gameUI;
    }

    startTimer() {
        // Reset timer to full duration
        this.timeLeft = 180;

        // Remove any previous timer event if exists
        if (this.timerEvent) {
            this.timerEvent.remove(false);
        }

        // Create the countdown timer event
        this.timerEvent = this.scene.time.addEvent({
            delay: 1000, // 1 second
            callback: this.updateTimer,
            callbackScope: this,
            loop: true,
        });

        return this.timerEvent;
    }

    updateTimer() {
        if (typeof this.timeLeft === "number") {
            this.timeLeft = Math.max(0, this.timeLeft - 1);

            // Update UI if available
            if (this.gameUI) {
                this.gameUI.updateTimer(this.timeLeft);
            }

            if (this.timeLeft <= 0) {
                this.onTimerEnd();
                if (this.timerEvent) {
                    this.timerEvent.remove(); // Stop the timer
                }
            }
        }
    }

    onTimerEnd() {
        console.log("Timer finished!");

        this.scene.scene.start("GameOver", {
            levelId: this.scene.levelId,
            playerName: this.scene.playerName,
            socket: this.scene.socket,
        });
    }

    applyPenalty(seconds = 5) {
        if (typeof this.timeLeft === "number") {
            const penalty = this.scene.instantDeathMode ? this.timeLeft : seconds;
            this.timeLeft = Math.max(0, this.timeLeft - penalty);

            // Update UI immediately
            if (this.gameUI) {
                this.gameUI.updateTimer(this.timeLeft);
            }

            console.log(`Penalty applied: -${seconds} seconds`);
        }
    }

    getTimeLeft() {
        return this.timeLeft;
    }

    shutdown() {
        if (this.timerEvent) {
            this.timerEvent.remove(false);
            this.timerEvent = null;
        }
    }
}
