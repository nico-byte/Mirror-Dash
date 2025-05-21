/**
 * Simple logging utility
 */
class Logger {
    /**
     * Log a regular message
     * @param {string} module - Source module
     * @param {string} message - Message to log
     * @param {any} data - Optional data to log
     */
    static log(module, message, data = null) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${module}] ${message}`);

        if (data) {
            console.log(data);
        }
    }

    /**
     * Log an error message
     * @param {string} module - Source module
     * @param {string} message - Error message
     * @param {Error|any} error - Error object or data
     */
    static error(module, message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [${module}] ERROR: ${message}`);

        if (error) {
            if (error instanceof Error) {
                console.error(`${error.message}\n${error.stack}`);
            } else {
                console.error(error);
            }
        }
    }

    /**
     * Log a warning message
     * @param {string} module - Source module
     * @param {string} message - Warning message
     * @param {any} data - Optional data
     */
    static warn(module, message, data = null) {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [${module}] WARNING: ${message}`);

        if (data) {
            console.warn(data);
        }
    }
}

export default Logger;
