import LobbyService from "./LobbyService.js";
import Logger from "../utils/logger.js";

/**
 * Service for managing game timers
 */
class TimerService {
    constructor() {
        this.timerInterval = null;
    }

    /**
     * Initialize the timer service
     * @param {function} timerEndCallback - Callback for when a timer ends
     */
    initialize(timerEndCallback) {
        // Process timers every second
        this.timerInterval = setInterval(() => {
            this.processTimers(timerEndCallback);
        }, 1000);

        Logger.log("TimerService", "Timer service initialized");
    }

    /**
     * Process all active timers
     * @param {function} timerEndCallback - Callback for when a timer ends
     */
    processTimers(timerEndCallback) {
        // Use the lobby service to process all timers
        LobbyService.processTimers();

        // The lobby service will update timer states, we just need to broadcast updates
        // This is handled in the socket handlers
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
}

// Export as singleton
export default new TimerService();
