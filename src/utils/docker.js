import deepMerge from './deepMerge';
import fs from 'fs-extra';
import * as path from 'path';
import Ping from './ping';
import { runCommand, runProcess } from './childProcess';
import { EventEmitter } from 'events';
import serializeOptions from './optionsSerializer';
import DockerEventsListener from './dockerEventsListener';
import { ChildProcess } from 'child_process';

const SPACE = ' ';
const INSPECT_DOCKER_INTERVAL = 500;
const MAX_INSPECT_ATTEMPTS = 10;
const DEFAULT_OPTIONS = {
    rm: true
};

/**
 * @class {Docker} Provides functionality to run docker container
 */
class Docker extends EventEmitter {
    /**
     * @param {String} image Docker image/tag name
     * @param {Object} options Docker run options
     * @param {Object} [options.options] Docker run options
     * @param {String|Object} [options.healthCheck] Url that verifies that service is running
     * @param {String} [options.command] docker command that follows image/tag name
     * @param {String} [options.args] docker args that follow image/tag name
     * @param {Boolean} [options.debug]
     * @param {Object} logger Logger or console
     */
    constructor(image, { options = {}, healthCheck = {}, command, args, debug = false } = {}, logger = console) {
        super();

        if (!image) {
            throw new Error('Missing required image argument');
        }

        this.args = args;
        this.cidfile = path.join(process.cwd(), `${ image.replace(/\W+/g, '_') }.cid`);
        this.command = command;
        this.debug = debug;
        this.healthCheck = healthCheck;
        this.image = image;
        this.logger = logger;
        this.process = null;
        this.dockerEventsListener = new DockerEventsListener(logger);

        if (typeof healthCheck === 'string') {
            this.healthCheck = { url: healthCheck };
        }

        this.options = deepMerge({
            cidfile: this.cidfile
        }, DEFAULT_OPTIONS, options);

        const cmdChain = ['docker', 'run'].concat(serializeOptions(this.options), [this.image]);

        if (this.command) {
            cmdChain.push(this.command);
        }

        if (this.args) {
            cmdChain.push(this.args);
        }

        this.dockerRunCommand = cmdChain;
    }

    /**
     * @return {Promise<ChildProcess>}
     */
    async run() {
        this.logger.log(`Docker command: ${ this.dockerRunCommand.join(SPACE) }`);
        this.dockerEventsListener.connect({
            filter: `image=${ this.image }`
        });

        if (this.debug) {
            this.dockerEventsListener.once('image.pull', (event) => {
                this.logger.info('Pulling image:', JSON.stringify(event, null, 4));
            });
        }

        await this._removeStaleContainer();

        try {
            await this._isImagePresent();
        } catch (_err) {
            this.logger.warn('NOTE: Pulling image for the first time. Please be patient.');
            return this._pullImage();
        }

        this.logger.info(`Launching docker image '${this.image}'`);
        const process = await runProcess(this.dockerRunCommand);
        this.process = process;
        this.emit('processCreated');

        if (this.debug) {
            this.process.stdout.on('data', (data) => {
                this.logger.log(data.toString());
            });

            this.process.stderr.on('data', (data) => {
                this.logger.error(data.toString());
            });

            this.dockerEventsListener.once('container.start', (event) => {
                this.logger.info('Container started:', JSON.stringify(event, null, 4));
            });

            this.dockerEventsListener.once('container.stop', (event) => {
                this.logger.info('Container stopped:', JSON.stringify(event, null, 4));
            });
        }

        await this._reportWhenDockerIsRunning();
        this.logger.info('Docker container is ready');
        return process;
    }

    /**
     * @return {Promise<void>}
     */
    async stop() {
        await this._removeStaleContainer();

        if (this.process) {
            this.process.kill();
            this.process = null;
        }

        this.logger.info('Docker container has stopped');
        this.dockerEventsListener.disconnect();
    }

    /**
     * Polls for availability of application running in a docker
     * @return {Promise<void>}
     * @private
     */
    _reportWhenDockerIsRunning() {
        const {
            url,
            maxRetries = MAX_INSPECT_ATTEMPTS,
            inspectInterval = INSPECT_DOCKER_INTERVAL,
            startDelay = 0
        } = this.healthCheck;

        if (url === undefined) {
            return Promise.resolve();
        }

        /** @type {Promise<void>} */
        const waitForDockerHealthCheck = new Promise((resolve) => {
            this.dockerEventsListener.on('container.health_status', (event) => {
                if (event.args === 'healthy') {
                    resolve();
                }
            });
        });

        /** @type {Promise<void>} */
        const waitForHealthCheckPoll = Docker.delay(startDelay)
            .then(() => new Promise((resolve, reject) => {
                let attempts = 0;

                /** @type {NodeJS.Timeout | undefined} */
                let pollstatus;

                const poll = () => {
                    Ping(url)
                        .then(() => {
                            resolve();
                            clearTimeout(pollstatus);
                            pollstatus = undefined;
                        })
                        .catch((err) => {
                            attempts++;
                            if (attempts >= maxRetries) {
                                clearTimeout(pollstatus);
                                pollstatus = undefined;
                                reject(err);
                                return;
                            }

                            pollstatus = setTimeout(poll, inspectInterval);
                        });
                };

                pollstatus = setTimeout(poll, inspectInterval);
            }));

        return Promise.race([waitForDockerHealthCheck, waitForHealthCheckPoll]);
    }

    /**
     * @return {Promise<ChildProcess>}
     * @private
     */
    _isImagePresent() {
        return runCommand(['docker', 'inspect', this.image]);
    }

    /**
     * @return {Promise<ChildProcess>}
     * @private
     */
    _pullImage() {
        return runCommand(['docker', 'pull', this.image]);
    }

    /**
     * Removes any stale docker image
     * @return {Promise<void>}
     * @private
     */
    async _removeStaleContainer() {
        try {
            const cid = (await fs.readFile(this.cidfile)).toString();
            this.logger.info('Shutting down running container');
            await Docker.stopContainer(cid);
            await Docker.removeContainer(cid);
        }
        catch (_err) {} // eslint-disable-line no-empty

        this.logger.info('Cleaning up CID files');
        await fs.remove(this.cidfile);
    }

    /**
     * @static
     * @param {Number} timeMs
     * @return {Promise<void>}
     */
    static delay(timeMs) {
        return new Promise(resolve => {
            setTimeout(resolve, timeMs);
        });
    }

    /**
     * @static
     * @param {String} cid Container id
     * @return {Promise<ChildProcess>}
     */
    static stopContainer(cid) {
        return runCommand(['docker', 'stop', cid]);
    }

    /**
     * @static
     * @param {String} cid Container id
     * @return {Promise<ChildProcess>}
     */
    static removeContainer(cid) {
        return runCommand(['docker', 'rm', cid]);
    }
}

export default Docker;
