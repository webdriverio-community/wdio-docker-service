import fs from 'fs-extra';
import logger from '@wdio/logger';
import { SevereServiceError } from 'webdriverio';
import getFilePath from './utils/getFilePath.js';
import Docker, { DockerArgs, DockerForTests } from './utils/docker.js';

import type { Services, Options, Capabilities } from '@wdio/types';
import type { WebDriverLogTypes } from '@wdio/types/build/Options.js';

const DEFAULT_LOG_FILENAME = 'docker-log.txt';
const LoggerService = logger('wdio-docker-service');

export interface DockerLauncherConfig extends Options.Testrunner { 
    dockerOptions: DockerArgs & { image: string };
    logToStdout?: boolean;
    dockerLogs?: string | null;
    watch?: boolean;
    logLevel?: WebDriverLogTypes;
    onDockerReady?: () => void;
}

class DockerLauncher implements Services.ServiceInstance {
    logToStdout?: boolean;
    docker?: Docker | null;
    dockerLogs?: string | null;
    watchMode?: boolean;

    constructor(
        private _options?: unknown,
        private _capabilities?: Capabilities.RemoteCapability,
        private _config?: Omit<Options.Testrunner, 'capabilities'>
    ) {
        this.logToStdout = false;
        this.docker = null;
        this.dockerLogs = null;
    }

    onPrepare(config: DockerLauncherConfig) {
        this.logToStdout = config.logToStdout;
        this.dockerLogs = config.dockerLogs;
        this.watchMode = !!config.watch;

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
            throw new SevereServiceError('dockerOptions.image is a required property');
        }

        if (logLevel) {
            LoggerService.setLevel(logLevel);
        }

        this.docker = new Docker(image, {
            args,
            command,
            healthCheck,
            options,
            debug: !!logLevel && logLevel === 'debug'
        }, LoggerService);

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
                LoggerService.error(`Failed to run container: ${(err as Record<string, unknown>).message}`);
                this.docker?.stop();
            });
    }

    onComplete() {
        // do not stop docker if in watch mode
        if (!this.watchMode && this.docker) {
            return this.docker.stop();
        }
    }

    afterSession() {
        if (this.docker?.process?.connected) {
            this.docker.stop();
        }
    }

    _redirectLogStream(logFile: string) {
        // ensure file & directory exists
        return fs.ensureFile(logFile).then(() => {
            const logStream = fs.createWriteStream(logFile, { flags: 'w' });

            this.docker?.process?.stdout?.pipe(logStream);
            this.docker?.process?.stderr?.pipe(logStream);
        });
    }
}

class DockerLauncherForTests extends DockerLauncher {
    public declare logToStdout?: boolean;
    public declare docker?: DockerForTests | null;
    public declare dockerLogs?: string | null;
    public declare watchMode?: boolean;
}

export default DockerLauncher;
export { DockerLauncherForTests };
