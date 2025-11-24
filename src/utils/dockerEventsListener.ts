import EventEmitter from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { fork as defaultFork } from 'node:child_process'
import path from 'node:path'
import url from 'node:url'

import type { Logger } from '@wdio/logger'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const DOCKER_EVENTS_MODULE = path.resolve(__dirname, '..', 'modules/dockerEvents.ts')

class DockerEventsListener extends EventEmitter {
    logger: Logger | Console
    _subprocess: ChildProcess | null
    private _fork: typeof defaultFork

    constructor(logger: Logger | Console = console, fork: typeof defaultFork = defaultFork) {
        super()

        this.logger = logger
        this._subprocess = null
        this._onMessage = this._onMessage.bind(this)
        this._onError = this._onError.bind(this)
        this._fork = fork
    }

    connect(
        /** Command line options for 'docker events' */
        opt: Record<string, unknown> = {}
    ) {
        this.disconnect()

        const sps = this._fork(DOCKER_EVENTS_MODULE)
        sps.on('message', this._onMessage)
        sps.on('error', this._onError)
        sps.send(opt)

        this.logger.warn('Connecting dockerEventsListener:', sps.pid)

        this._subprocess = sps
    }

    disconnect() {
        if (this._subprocess && this._subprocess.connected) {
            this.logger.warn('Disconnecting dockerEventsListener:', this._subprocess.pid)
            this._subprocess.disconnect()
            this._subprocess.kill()
        }
        this._subprocess = null
    }

    /**
     * @param message Event JSON
     */
    protected _onMessage(message: { type: string; message: string; }) {
        if ('error' === message.type) {
            this._onError(new Error(message.message))
            return
        }

        this.emit(message.type, message)
    }

    _onError(err: Error) {
        this.logger.error(err)
        this.disconnect()
    }
}

export default DockerEventsListener

