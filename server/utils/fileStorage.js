import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

/**
 * Utility for reading and writing files
 */
class FileStorage {
    /**
     * Read data from a JSON file
     * @param {string} filename - Path to the file relative to server root
     * @returns {Promise<Object>} - Parsed JSON data
     */
    static async readJsonFile(filename) {
        try {
            const filePath = path.join(rootDir, filename);

            // Check if file exists
            await fs.access(filePath);

            // Read and parse file
            const data = await fs.readFile(filePath, "utf8");
            return JSON.parse(data);
        } catch (error) {
            // If file doesn't exist or can't be parsed, return empty object
            if (error.code === "ENOENT" || error instanceof SyntaxError) {
                return {};
            }
            // Rethrow other errors
            throw error;
        }
    }

    /**
     * Write data to a JSON file
     * @param {string} filename - Path to the file relative to server root
     * @param {Object} data - Data to write
     * @returns {Promise<void>}
     */
    static async writeJsonFile(filename, data) {
        try {
            const filePath = path.join(rootDir, filename);
            await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
            return true;
        } catch (error) {
            console.error(`Error writing to file ${filename}:`, error);
            return false;
        }
    }
}

export default FileStorage;
