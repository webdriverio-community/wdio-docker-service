import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'fs-extra'
import path from 'node:path'

import Ping from './ping.js'
import deepMerge from './deepMerge.js'
import serializeOptions from './optionsSerializer.js'
import { runCommand, runProcess } from './childProcess.js'
import DockerEventsListener from './dockerEventsListener.js'

import type { Logger } from '@wdio/logger'

const SPACE = ' '
const INSPECT_DOCKER_INTERVAL = 500
const MAX_INSPECT_ATTEMPTS = 10
const DEFAULT_OPTIONS = {
    rm: true,
}

type HealthCheckArgs = {
    /** url to an app running inside your container */
    url: string;
    /** number of retries until healthcheck fails. Default: 10 */
    maxRetries?: number;
    /** interval between each retry in ms. Default: 500 */
    inspectInterval?: number;
    /** initial delay to begin healthcheck in ms. Default: 0 */
    startDelay?: number;
}

export type DockerRunArgs = {
    /** Add a custom host-to-IP mapping (host:ip) */
    addHost?: string[];
    /** Add an annotation to the container (passed through to the OCI runtime) (default map[]) */
    annotationMap?: string;
    /** Attach to STDIN, STDOUT or STDERR */
    attachList?: string[];
    /** Block IO (relative weight), between 10 and 1000, or 0 to disable (default 0) */
    blkioWeight?: number;
    /** Block IO weight (relative device weight) (default []) */
    blkioWeightDevice?: string[];
    /** Add linux capabilities */
    capAdd?: string[];
    /** Drop linux capabilities */
    capDrop?: string[];
    /** Optional parent cgroup for the container */
    cgroupParent?: string;
    /**
     * Cgroup namespace to use (host|private)
     *
     * * 'host': Run the container in the Docker host's cgroup namespace
     * * 'private': Run the container in its own private cgroup namespace
     * * '': Use the cgroup namespace as configured by the default-cgroupns-mode
     *       option on the daemon (default)
     */
    cgroupns?: 'host' | 'private' | '';
    /** Write the container ID to the file */
    cidfile?: string;
    /** Limit CPU CFS (Completely Fair Scheduler) period */
    cpuPeriod?: number;
    /** Limit CPU CFS (Completely Fair Scheduler) quota */
    cpuQuota?: number;
    /** Limit CPU real-time period in microseconds */
    cpuRtPeriod?: number;
    /** Limit CPU real-time runtime in microseconds */
    cpuRtRuntime?: number;
    /** CPU shares (relative weight) */
    cpuShares?: number;
    /** Number of CPUs */
    cpus?: number;
    /** CPUs in which to allow execution (0-3, 0,1) */
    cpusetCpus?: string;
    /** MEMs in which to allow execution (0-3, 0,1) */
    cpusetMems?: string;
    /** Run container in background and print container ID */
    d?: boolean;
    /** Run container in background and print container ID */
    detach?: boolean;
    /** Override the key sequence for detaching a container */
    detachKeys?: string;
    /** Add a host device to the container */
    device?: string[];
    /** Add a rule to the cgroup allowed devices list */
    deviceCgroupRule?: string[];
    deviceReadBps?: string[];
    deviceReadIops?: string[];
    deviceWriteBps?: string[];
    deviceWriteIops?: string[];
    disableContentTrust?: boolean;
    dns?: string[];
    dnsOption?: string[];
    dnsSearch?: string[];
    domainname?: string;
    entrypoint?: string;
    /** Set environment variables */
    e?: string[];
    /** Set environment variables */
    env?: string[];
    envFile?: string[];
    expose?: string[];
    gpus?: string;
    groupAdd?: string[];
    /** Command to run to check health */
    healthCmd?: string;
    healthInterval?: string;
    healthRetries?: number;
    healthStartPeriod?: string;
    healthTimeout?: string;
    help?: boolean;
    hostname?: string;
    init?: boolean;
    interactive?: boolean;
    ip?: string;
    ip6?: string;
    ipc?: string;
    isolation?: string;
    kernelMemory?: string;
    label?: string[];
    labelFile?: string[];
    link?: string[];
    linkLocalIp?: string[];
    logDriver?: string;
    logOpt?: string[];
    macAddress?: string;
    memory?: string;
    memoryReservation?: string;
    memorySwap?: string;
    memorySwappiness?: number;
    mount?: string;
    name?: string;
    network?: string;
    networkAlias?: string[];
    noHealthcheck?: boolean;
    oomKillDisable?: boolean;
    oomScoreAdj?: number;
    p?: string[]
    pid?: string;
    pidsLimit?: number;
    platform?: string;
    privileged?: boolean;
    publish?: string[];
    publishAll?: boolean;
    pull?: string;
    quiet?: boolean;
    readOnly?: boolean;
    restart?: string;
    rm?: boolean;
    runtime?: string;
    securityOpt?: string[];
    shmSize?: string;
    sigProxy?: boolean;
    stopSignal?: string;
    stopTimeout?: number;
    storageOpt?: string[];
    sysctl?: Record<string, string>;
    tmpfs?: string[];
    tty?: boolean;
    ulimit?: string;
    user?: string;
    userns?: string;
    uts?: string;
    v?: string[];
    volume?: string[];
    volumeDriver?: string;
    volumesFrom?: string[];
    workdir?: string;
}

export interface DockerArgs {
    /** Docker run options */
    options?: DockerRunArgs;
    /** Url that verifies that service is running */
    healthCheck?: string | HealthCheckArgs | Record<string, never>;
    /** docker args that follow image/tag name */
    args?: string;
    /** docker command that follows image/tag name */
    command?: string;
    /** toggles debug mode */
    debug?: boolean;
}

/**
 * @class {Docker} Provides functionality to run docker container
 */
class Docker extends EventEmitter {
    protected args?: string
    protected cidfile: string
    protected command?: string
    protected debug: boolean
    protected healthCheck?: string | HealthCheckArgs | Record<string, never>
    protected image: string
    protected logger: Logger | Console
    public process: null | ChildProcess
    protected dockerEventsListener: DockerEventsListener
    protected dockerRunCommand: string[]
    protected options: Record<string, unknown>

    constructor(
        /** Docker image/tag name */
        image: string,
        {
            options = {},
            healthCheck = {},
            command,
            args,
            debug = false,
        }: DockerArgs = {},
        /** Logger or console */
        logger: Logger | Console = console
    ) {
        super()

        if (!image) {
            throw new Error('Missing required image argument')
        }

        this.args = args
        this.cidfile = path.join(
            process.cwd(),
            `${image.replace(/\W+/g, '_')}.cid`
        )
        this.command = command
        this.debug = debug
        this.healthCheck = healthCheck
        this.image = image
        this.logger = logger
        this.process = null
        this.dockerEventsListener = new DockerEventsListener(logger)

        if (typeof healthCheck === 'string') {
            this.healthCheck = { url: healthCheck }
        }

        this.options = deepMerge(
            {
                cidfile: this.cidfile,
            },
            DEFAULT_OPTIONS,
            options
        )

        const cmdChain = ['docker', 'run'].concat(
            serializeOptions(this.options),
            [this.image]
        )

        if (this.command) {
            cmdChain.push(this.command)
        }

        if (this.args) {
            // check if args are in camelcase and convert to kebab case and assign to new variable to satisfy docker argument format
            const argsArray = this.args.split(' ')
            const argsArrayKebab = argsArray.map((arg) => {
                if (arg.includes('--')) {
                    return arg
                }
                return arg.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
            })
            const args = argsArrayKebab.join(' ')
            cmdChain.push(args)
        }

        this.dockerRunCommand = cmdChain
    }

    async run() {
        this.logger.log(`Docker command: ${this.dockerRunCommand.join(SPACE)}`)
        this.dockerEventsListener.connect({
            filter: `image=${this.image}`,
        })

        if (this.debug) {
            this.dockerEventsListener.once('image.pull', (event) => {
                this.logger.info(
                    'Pulling image:',
                    JSON.stringify(event, null, 4)
                )
            })
        }

        await this._removeStaleContainer()

        try {
            await this._isImagePresent()
        } catch {
            this.logger.warn('NOTE: Pulling image for the first time. Please be patient.')
            await this._pullImage()
        }

        this.logger.info(`Launching docker image '${this.image}'`)
        const process = await runProcess(this.dockerRunCommand)
        this.process = process
        this.emit('processCreated')

        if (this.debug) {
            this.process.stdout?.on('data', (data) => {
                this.logger.log(data.toString())
            })

            this.process.stderr?.on('data', (data) => {
                this.logger.error(data.toString())
            })

            this.dockerEventsListener.once('container.start', (event) => {
                this.logger.info('Container started:', JSON.stringify(event, null, 4))
            })

            this.dockerEventsListener.once('container.stop', (event) => {
                this.logger.info('Container stopped:', JSON.stringify(event, null, 4))
            })
        }

        await this._reportWhenDockerIsRunning()
        this.logger.info('Docker container is ready ✅')
        return process
    }

    async stop() {
        await this._removeStaleContainer()

        this.process?.kill()
        this.process?.unref()
        this.process = null

        this.logger.info('Docker container has stopped')
        this.dockerEventsListener.disconnect()
    }

    /**
     * Polls for availability of application running in a docker container
     */
    protected async _reportWhenDockerIsRunning() {
        const {
            url,
            maxRetries = MAX_INSPECT_ATTEMPTS,
            inspectInterval = INSPECT_DOCKER_INTERVAL,
            startDelay = 0,
        } = this.healthCheck as HealthCheckArgs

        if (url === undefined) {
            return 'No health check URL provided'
        }

        const waitForDockerHealthCheck = new Promise<void>((resolve) => {
            this.dockerEventsListener.on('container.health_status', (event) => {
                if (event.args === 'healthy') {
                    resolve()
                }
            })
        })

        const waitForHealthCheckPoll = Docker.delay(startDelay).then(
            () =>
                new Promise<void>((resolve, reject) => {
                    let attempts = 0
                    let pollstatus: NodeJS.Timeout | null = null

                    const poll = () => {
                        attempts++
                        Ping(new URL(url))
                            .then(() => {
                                if (pollstatus) {
                                    clearTimeout(pollstatus)
                                    pollstatus = null
                                }
                                resolve()
                            })
                            .catch((err) => {
                                if (attempts >= maxRetries) {
                                    if (pollstatus) {
                                        clearTimeout(pollstatus)
                                        pollstatus = null
                                    }
                                    reject(err)
                                    return
                                }

                                pollstatus = setTimeout(poll, inspectInterval)
                            })
                    }

                    poll()
                })
        )

        return Promise.race([waitForDockerHealthCheck, waitForHealthCheckPoll])
    }

    /**
     * Checks if docker image is present
     */
    protected _isImagePresent() {
        return runCommand(['docker', 'inspect', this.image])
    }

    /**
     * Pulls an image from docker registry
     */
    protected _pullImage() {
        return runCommand(['docker', 'pull', this.image])
    }

    /**
     * Removes any stale docker image
     */
    async _removeStaleContainer() {
        try {
            this.logger.info('🧹🧹 Cleaning up stale docker files 🧹🧹')
            const cid = await fs.readFile(this.cidfile)
            this.logger.info('1. Shutting down running container ⏱')
            await Docker.stopContainer(cid.toString())
            await Docker.removeContainer(cid.toString())
        } catch {
            this.logger.info('No stale container found ✅')
        }

        this.logger.info('2. Cleaning up CID files 🧹')
        await fs.remove(this.cidfile)
    }

    static delay(timeMs: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeMs)
        })
    }

    static stopContainer(/** Container ID */ cid: string) {
        return runCommand(['docker', 'stop', cid])
    }

    static removeContainer(/** Container ID */ cid: string) {
        return runCommand(['docker', 'rm', cid])
    }
}

type CommandResult = {
    /** Command exit code */
    code: number;
    /** Command stdout */
    stdout: string;
    /** Command stderr */
    stderr: string;
    /** Command executed */
    command: string;
}

class DockerForTests extends Docker {
    declare public args?: string
    declare public cidfile: string
    declare public command?: string
    declare public debug: boolean
    declare public healthCheck?: string | HealthCheckArgs | Record<string, never>
    declare public image: string
    declare public logger: Logger | Console
    declare public process: null | ChildProcess
    declare public dockerEventsListener: DockerEventsListener
    declare public dockerRunCommand: string[]
    declare public options: Record<string, unknown>
    declare public _reportWhenDockerIsRunning: () => Promise<void>
    declare public _isImagePresent: () => Promise<CommandResult>
    declare public _pullImage: () => Promise<CommandResult>
}

export default Docker
export { DockerForTests }
