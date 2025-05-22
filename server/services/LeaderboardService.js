import Leaderboard from "../models/Leaderboard.js";
import FileStorage from "../utils/fileStorage.js";
import config from "../config/config.js";
import Logger from "../utils/logger.js";

/**
 * Service für die Verwaltung der Bestenliste
 */
class LeaderboardService {
    constructor() {
        this.leaderboard = new Leaderboard();
        this.initialized = false;
    }

    /**
     * Initialisiert den Leaderboard-Service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Lade Leaderboard-Daten aus Datei
            const data = await FileStorage.readJsonFile(config.LEADERBOARD_FILE);
            this.leaderboard.fromJSON(data);

            Logger.log("LeaderboardService", "Bestenliste erfolgreich geladen");
            this.initialized = true;
        } catch (error) {
            Logger.error("LeaderboardService", "Fehler beim Initialisieren der Bestenliste", error);
            this.leaderboard = new Leaderboard();
        }
    }

    /**
     * Aktualisiert einen Spielereintrag in der Bestenliste
     * und speichert die Änderungen sofort in der Datei
     * @param {string} playerName - Spielername
     * @param {string} levelId - Level-ID
     * @param {number} timeLeft - Verbleibende Zeit beim Abschluss
     * @param {number} stars - Verdiente Sterne
     */
    async updatePlayer(playerName, levelId, timeLeft, stars) {
        if (!playerName) return null;

        const LEVEL_TOTAL_TIME = config.LEVEL_TOTAL_TIME;
        const elapsedTime = LEVEL_TOTAL_TIME - timeLeft;
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        Logger.log(
            "LeaderboardService",
            `Bestenliste aktualisiert: ${playerName} hat ${levelId} in ${timeFormatted} mit ${stars} Sternen abgeschlossen (${timeLeft}s verbleibend)`
        );

        // Spieler in Bestenliste aktualisieren
        this.leaderboard.updatePlayer(playerName, levelId, timeLeft, stars);

        // Änderungen sofort in Datei speichern (direkt nach Level-Abschluss)
        await this.saveLeaderboard();

        return this.getSortedLeaderboard();
    }

    /**
     * Speichert die Bestenliste in einer Datei
     */
    async saveLeaderboard() {
        try {
            await FileStorage.writeJsonFile(config.LEADERBOARD_FILE, this.leaderboard.toJSON());
            Logger.log("LeaderboardService", "Bestenliste erfolgreich gespeichert");
            return true;
        } catch (error) {
            Logger.error("LeaderboardService", "Fehler beim Speichern der Bestenliste", error);
            return false;
        }
    }

    /**
     * Gibt sortierte Bestenlisten-Einträge zurück
     * @returns {Array} - Sortierte Einträge
     */
    getSortedLeaderboard() {
        return this.leaderboard.getSortedEntries();
    }

    /**
     * Bereinigt Ressourcen vor dem Beenden
     */
    cleanup() {
        // Eine letzte Speicherung vor dem Herunterfahren
        this.saveLeaderboard();
    }
}

// Als Singleton exportieren
export default new LeaderboardService();
