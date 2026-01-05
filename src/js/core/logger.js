/**
 * Logger utility with consistent formatting
 */
export class Logger {
    constructor(moduleName) {
        this.moduleName = moduleName;
    }

    static create(moduleName) {
        return new Logger(moduleName);
    }

    info(message, context = null) {
        this._log('INFO', message, context);
    }

    warn(message, context = null) {
        this._log('WARN', message, context);
    }

    error(message, context = null) {
        this._log('ERROR', message, context);
    }

    _log(level, message, context) {
        const timestamp = new Date().toISOString();
        const msg = `[${timestamp}] [${this.moduleName}] [${level}] ${message}`;

        if (level === 'ERROR') {
            console.error(msg, context || '');
        } else if (level === 'WARN') {
            console.warn(msg, context || '');
        } else {
            console.log(msg, context || '');
        }
    }
}

