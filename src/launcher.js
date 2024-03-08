import fs from 'fs-extra';
import { SevereServiceError } from 'webdriverio';
import Docker from './utils/docker';
import getFilePath from './utils/getFilePath';
import logger from '@wdio/logger';

const DEFAULT_LOG_FILENAME = 'docker-log.txt';
const Logger = logger('wdio-docker-service');

class DockerLauncher {
    constructor() {
        this.logToStdout = false;
        this.docker = null;
        this.dockerLogs = null;
    }

    /**
     * @returns {Promise<void>}
     */
    async onPrepare(config) {
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
            throw new Error('dockerOptions.image is a required property');
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

        try {
            await this.docker.run();
            if (typeof onDockerReady === 'function') {
                onDockerReady();
            }
        }
        catch (err) {
            if (err.code === 'ENOENT' && err.path === 'docker') {
                throw new SevereServiceError('Docker was not found.');
            }
            Logger.error(`Failed to run container: ${ err.message }`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async onComplete() {
        // do not stop docker if in watch mode
        if (!this.watchMode && this.docker) {
            await this.docker.stop();
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
    async _redirectLogStream(logFile) {
        // ensure file & directory exists
        await fs.ensureFile(logFile);
        
        const logStream = fs.createWriteStream(logFile, { flags: 'w' });
        this.docker.process.stdout.pipe(logStream);
        this.docker.process.stderr.pipe(logStream);
    }
}

module.exports = DockerLauncher;
