import chalk from 'chalk';

const SPACE = ' ';

const COLORS = {
    INFO: chalk.hex('#6495ED'),
    ERROR: chalk.keyword('crimson'),
    WARN: chalk.keyword('orange'),
    LOG: chalk.gray
};

const ColorLogger = {
    info(...msg) {
        this._writeLog('info', msg.join(SPACE), COLORS.INFO);
    },

    error(...msg) {
        this._writeLog('error', msg.join(SPACE), COLORS.ERROR);
    },

    warn(...msg) {
        this._writeLog('warn', msg.join(SPACE), COLORS.WARN);
    },

    log(...msg) {
        this._writeLog('log', msg.join(SPACE));
    },

    /**
     * @param {String} method Corresponding console method name
     * @param {String} msg Message to log
     * @param {Function} color Chalk color function
     * @private
     */
    _writeLog(method, msg, color = COLORS.LOG) {
        console[method](color(msg));
    }
};

module.exports = ColorLogger;
