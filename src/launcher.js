import fs from 'fs-extra';
import logger from '@wdio/logger';
import Docker from './utils/docker.js';
import getFilePath from './utils/getFilePath.js';

const DEFAULT_LOG_FILENAME = 'docker-log.txt';
const Logger = logger('wdio-docker-service');

class DockerLauncher {
    constructor() {
        this.logToStdout = false;
        this.docker = null;
        this.dockerLogs = null;
    }

    onPrepare(config) {
        this.logToStdout = config.logToStdout;
        this.dockerLogs = config.dockerLogs;
        this.watchMode = !!config.watch;

        Logger.setLevel(config.logLevel || 'info');

        const {
            dockerOptions: {
                args,
                command,
                healthCheck,
                image,
                options,
            },
            onDockerReady,
            logLevel
        } = config;

        if (!image) {
            return Promise.reject(new Error('dockerOptions.image is a required property'));
        }

        this.docker = new Docker(image, {
            args,
            command,
            healthCheck,
            options,
            debug: logLevel && logLevel === 'debug'
        }, Logger);

        if (typeof this.dockerLogs === 'string') {
            const logFile = getFilePath(this.dockerLogs, DEFAULT_LOG_FILENAME);

            this.docker.once('processCreated', () => {
                this._redirectLogStream(logFile);
            });
        }

        return this.docker.run()
            .then(() => {
                if (typeof onDockerReady === 'function') {
                    onDockerReady();
                }
            })
            .catch((err) => {
                Logger.error(`Failed to run container: ${ err.message }`);
            });
    }

    onComplete() {
        // do not stop docker if in watch mode
        if (!this.watchMode && this.docker) {
            return this.docker.stop();
        }
    }

    afterSession() {
        if (this.docker) {
            this.docker.stop();
        }
    }

    /**
     * @param logFile
     * @private
     */
    _redirectLogStream(logFile) {
        // ensure file & directory exists
        return fs.ensureFile(logFile).then(() => {
            const logStream = fs.createWriteStream(logFile, { flags: 'w' });

            this.docker.process.stdout.pipe(logStream);
            this.docker.process.stderr.pipe(logStream);
        });
    }
}

export default DockerLauncher;
