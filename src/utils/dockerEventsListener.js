import EventEmitter from 'events';
import { fork } from 'child_process';
import path from 'path';

const DOCKER_EVENTS_MODULE = path.resolve(__dirname, '..', 'modules/dockerEvents');

/**
 * @class DockerEventsListener
 * @extends {EventEmitter}
 */
class DockerEventsListener extends EventEmitter {
    /**
     * @constructor
     * @param {Boolean} [debug]
     * @param {ColorLogger} [logger]
     */
    constructor(debug = false, logger = console) {
        super();

        this.debug = debug;
        this.logger = logger;
        this._subprocess = null;
        this._onMessage = this._onMessage.bind(this);
        this._onError = this._onError.bind(this);
    }

    /**
     * @param {Object} opt Command line options for 'docker events'
     */
    connect(opt = {}) {
        this.disconnect();

        const sps = fork(DOCKER_EVENTS_MODULE);
        sps.on('message', this._onMessage);
        sps.on('error', this._onError);
        sps.send(opt);

        this.debug && this.logger.warn('Connecting dockerEventsListener:', sps.pid);

        this._subprocess = sps;
    }

    disconnect() {
        if (this._subprocess && this._subprocess.connected) {
            this.debug && this.logger.warn('Disconnecting dockerEventsListener:', this._subprocess.pid);
            this._subprocess.disconnect();
        }
        this._subprocess = null;
    }

    /**
     * @param {Object} message Event JSON
     * @private
     */
    _onMessage(message) {
        if ('error' === message.type) {
            this._onError(new Error(message.message));
            return;
        }

        this.emit(message.type, message);
    }

    _onError(err) {
        this.logger.error(err);
        this.disconnect();
    }
}

export default DockerEventsListener;



