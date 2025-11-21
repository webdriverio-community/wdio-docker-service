import { exec, ChildProcess } from 'child_process';
import serializeOptions from '../utils/optionsSerializer.js';
import deepMerge from '../utils/deepMerge.js';

const NANOSECONDS = 1000000;
const DEFAULT_OPTIONS = {
    format: '"{{json .}}"',
};

const CMD = 'docker events';

type EventData = {
    Action: string;
    Actor: Record<string, unknown>;
    from: string | null;
    id: string | null;
    scope: string | null;
    status: string;
    timeNano: number;
    Type: string;
};

const DockerEvents = {
    process: null as ChildProcess | null,
    /**
     * @param {Object} [options]
     */
    async init(options: Record<string, unknown> = {}) {
        const cmdOptions = deepMerge({}, DEFAULT_OPTIONS, options);
        const cmd = [CMD].concat(serializeOptions(cmdOptions)).join(' ');
        const buffer: unknown[] = [];
        const ps = exec(cmd);

        /**
         * Capture stdout
         */
        ps.stdout?.setEncoding('utf-8');
        ps.stdout?.on('data', (data) => {
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
        let errorMessage = '';

        ps.stderr?.on('data', (data) => {
            errorMessage += data;
        });

        //Handle sub-process exit
        ps.on('exit', (code) => this._onExit(code || 0, cmd, errorMessage));

        //Handle forked process disconnect
        process.on('disconnect', () => this._onDisconnect());

        this.process = ps;
    },

    _onDisconnect() {
        this.process?.kill();
        this.process = null;
    },

    /**
     * @param {Number} code
     * @param {String} cmd
     * @param {String} errorMsg
     * @private
     */
    _onExit(code: number, cmd: string, errorMsg: string) {
        if (code !== 0 && process.connected) {
            process.send?.({
                type: 'error',
                message: `Error executing sub-child: ${cmd}${
                    errorMsg ? `\n${errorMsg}` : ''
                }`,
            });
        }
    },

    _parseEventData(jsonData: EventData) {
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
        const eventType = `${Type}.${action}`;
        const args =
            status.indexOf(':') !== -1
                ? status.slice(status.indexOf(':') + 1).trim()
                : '';
        if (process.connected) {
            process.send?.({
                args,
                image: from,
                timeStamp: new Date(timeNano / NANOSECONDS),
                type: eventType,
                status,
                detail: {
                    id,
                    scope,
                    actor: Actor,
                },
            });
        }
    },

    _tryParse(text: string) {
        try {
            return JSON.parse(text);
        } catch {
            return null;
        }
    },
};

process.on('message', (options) => {
    DockerEvents.init(options as Record<string, unknown>);
});

export default DockerEvents;
