import { exec } from 'child_process';
import serializeOptions from '../utils/optionsSerializer';
import deepMerge from '../utils/deepMerge';
import readStream from '../utils/readStream';

const NANOSECONDS = 1000000;
const DEFAULT_OPTIONS = {
    format: '"{{json .}}"'
};

const CMD = 'docker events';

const DockerEvents = {
    /**
     * @param {Object} [options]
     */
    async init(options = {}) {
        const cmdOptions = deepMerge({}, DEFAULT_OPTIONS, options);
        const cmd = [CMD].concat(serializeOptions(cmdOptions)).join(' ');
        const buffer = [];
        const ps = exec(cmd);

        /**
         * Capture stdout
         */
        ps.stdout.setEncoding('utf-8');
        ps.stdout.on('data', (data) => {
            buffer.push(data);
            const jsonString = buffer.join('');
            const json = this._tryParse(jsonString);

            if (json) {
                buffer.length = 0;
                this._parseEventData(json);
            }
        });

        /**
         * Capture stderr
         */
        const errorMessage = await readStream(ps.stderr);

        //Handle sub-process exit
        ps.on('exit', (code) => this._onExit(code, cmd, errorMessage));

        //Handle forked process disconnect
        process.on('disconnect', () => this._onDisconnect());

        this.process = ps;
    },

    _onDisconnect() {
        this.process.kill();
        this.process = null;
    },

    /**
     * @param {Number} code
     * @param {String} cmd
     * @param {String} errorMsg
     * @private
     */
    _onExit(code, cmd, errorMsg) {
        if (code !== 0 && process.connected) {
            process.send({
                type: 'error',
                message: `Error executing sub-child: ${ cmd }${ errorMsg ? `\n${ errorMsg }` : '' }`
            });
        }
    },
    /**
     * @param {Object} jsonData
     * @private
     */
    _parseEventData(jsonData) {
        if (!jsonData) {
            return;
        }

        const {
            Action,
            Actor = {},
            from = null,
            id = null,
            scope = null,
            status = '',
            timeNano,
            Type,
        } = jsonData;

        const [action] = Action.split(':');
        const eventType = `${ Type }.${ action }`;
        const args = status.indexOf(':') !== -1 ? status.slice(status.indexOf(':') + 1).trim() : '';

        process.send({
            args,
            image: from,
            timeStamp: new Date(timeNano / NANOSECONDS),
            type: eventType,
            status,
            detail: {
                id,
                scope,
                actor: Actor
            }
        });
    },

    /**
     * @param {String} text
     * @return {?Object}
     * @private
     */
    _tryParse(text) {
        try {
            return JSON.parse(text);
        }
        catch (e) {
            return null;
        }
    }
};

process.on('message', (options) => {
    DockerEvents.init(options);
});

module.exports = DockerEvents;

