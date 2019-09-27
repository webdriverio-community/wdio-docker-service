import { exec } from 'child_process';
import serializeOptions from '../utils/optionsSerializer';
import deepMerge from '../utils/deepMerge';

const NANOSECONDS = 1000000;
const DEFAULT_OPTIONS = {
    format: '"{{json .}}"'
};

const CMD = 'docker events';

const DockerEvents = {
    /**
     * @param {Object} [options]
     */
    init(options = {}) {
        const cmdOptions = deepMerge({}, DEFAULT_OPTIONS, options);
        const cmd = [CMD].concat(serializeOptions(cmdOptions)).join(' ');
        const buffer = [];

        const ps = exec(cmd);
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

        //Handle sub-process exit
        ps.on('exit', (code) => this._onExit(code, cmd));

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
     * @private
     */
    _onExit(code, cmd) {
        if (code !== 0 && process.connected) {
            process.send({
                type: 'error',
                message: `Error executing sub-child: ${ cmd }`
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
            status,
            timeNano,
            Type,
        } = jsonData;

        const eventType = `${Type}.${Action}`;

        process.send({
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
        } catch (e) {
            return null;
        }
    }
};


process.on('message', (options) => {
    DockerEvents.init(options);
});

module.exports = DockerEvents;

