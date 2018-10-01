import chalk from 'chalk';

const COLORS = {
    INFO: chalk.hex('#6495ED'),
    ERROR: chalk.keyword('crimson'),
    WARN: chalk.keyword('orange'),
    LOG: chalk.gray
};

const ColorLogger = {
    info(...msg) {
        this._writeLog('info', msg, COLORS.INFO);
    },

    error(...msg) {
        this._writeLog('error', msg, COLORS.ERROR);
    },

    warn(...msg) {
        this._writeLog('warn', msg, COLORS.WARN);
    },

    log(...msg) {
        this._writeLog('log', msg);
    },

    /**
     * @param {String} method Corresponding console method name
     * @param {String} msg Message to log
     * @param {Function} color Chalk color function
     * @private
     */
    _writeLog(method, msg, color = COLORS.LOG) {
        const [first, ...rest] = msg;
        console[method](color(first), ...rest);
    }
};

module.exports = ColorLogger;
