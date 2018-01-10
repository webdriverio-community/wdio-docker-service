import fs from 'fs-extra';
import Docker from './utils/docker';
import getFilePath from './utils/getFilePath';

const DEFAULT_LOG_FILENAME = 'docker-log.txt';

class DockerLauncher {
    constructor() {
        this.logToStdout = false;
        this.docker = null;
        this.dockerLogs = null;
    }

    onPrepare(config) {
        this.logToStdout = config.logToStdout;
        this.dockerLogs = config.dockerLogs;

        const {
            debug,
            coloredLogs,
            dockerOptions: {
                args,
                command,
                healthCheck,
                image,
                options,
            }
        } = config;

        const Logger = coloredLogs ? require('./utils/color-logger') : console;

        this.docker = new Docker(image, {
            args,
            command,
            debug,
            healthCheck,
            options,
        }, Logger);

        if (typeof this.dockerLogs === 'string') {
            this.docker.once('processCreated', () => {
                this._redirectLogStream();
            });
        }

        return this.docker.run()
            .catch((err) => {
                console.error(err.message);
            });
    }

    onComplete() {
        return this.docker.stop();
    }

    _redirectLogStream() {
        const logFile = getFilePath(this.dockerLogs, DEFAULT_LOG_FILENAME);

        // ensure file & directory exists
        fs.ensureFileSync(logFile);

        const logStream = fs.createWriteStream(logFile, { flags: 'w' });

        this.docker.process.stdout.pipe(logStream);
        this.docker.process.stderr.pipe(logStream);
    }
}

module.exports = DockerLauncher;
