import { ChildProcess } from "child_process";
import { EventEmitter } from "events";
import fs from "fs-extra";
import path from "path";

import Ping from "./ping.js";
import deepMerge from "./deepMerge.js";
import serializeOptions from "./optionsSerializer.js";
import { runCommand, runProcess } from "./childProcess.js";
import DockerEventsListener from "./dockerEventsListener.js";

import type { Logger } from "@wdio/logger";

const SPACE = " ";
const INSPECT_DOCKER_INTERVAL = 500;
const MAX_INSPECT_ATTEMPTS = 10;
const DEFAULT_OPTIONS = {
  rm: true,
};

type HealthCheckArgs = {
  /** url to an app running inside your container */
  url: string;
  /** number of retries until healthcheck fails. Default: 10 */
  maxRetries?: number;
  /** interval between each retry in ms. Default: 500 */
  inspectInterval?: number;
  /** initial delay to begin healthcheck in ms. Default: 0 */
  startDelay?: number;
};

export interface DockerArgs {
  /** Docker run options */
  options?: Record<string, never>;
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
  private args?: string;
  private cidfile: string;
  private command?: string;
  private debug: boolean;
  private healthCheck?: string | HealthCheckArgs | Record<string, never>;
  private image: string;
  private logger: Logger | Console;
  public process: null | ChildProcess;
  private dockerEventsListener: DockerEventsListener;
  private dockerRunCommand: string[];
  private options: Record<string, unknown>;


  constructor(
    /** Docker image/tag name */
    image: string,
    { options = {}, healthCheck = {}, command, args, debug = false }: DockerArgs = {},
    /** Logger or console */
    logger: Logger | Console = console
  ) {
    super();

    if (!image) {
      throw new Error("Missing required image argument");
    }

    this.args = args;
    this.cidfile = path.join(
      process.cwd(),
      `${image.replace(/\W+/g, "_")}.cid`
    );
    this.command = command;
    this.debug = debug;
    this.healthCheck = healthCheck;
    this.image = image;
    this.logger = logger;
    this.process = null;
    this.dockerEventsListener = new DockerEventsListener(logger);

    if (typeof healthCheck === "string") {
      this.healthCheck = { url: healthCheck };
    }

    this.options = deepMerge(
      {
        cidfile: this.cidfile,
      },
      DEFAULT_OPTIONS,
      options
    );

    const cmdChain = ["docker", "run"].concat(serializeOptions(this.options), [
      this.image,
    ]);

    if (this.command) {
      cmdChain.push(this.command);
    }

    if (this.args) {
      cmdChain.push(this.args);
    }

    this.dockerRunCommand = cmdChain;
  }

  /**
   * @return {Promise}
   */
  run() {
    this.logger.log(`Docker command: ${this.dockerRunCommand.join(SPACE)}`);
    this.dockerEventsListener.connect({
      filter: `image=${this.image}`,
    });

    if (this.debug) {
      this.dockerEventsListener.once("image.pull", (event) => {
        this.logger.info("Pulling image:", JSON.stringify(event, null, 4));
      });
    }

    return this._removeStaleContainer()
      .then(() => {
        return this._isImagePresent().catch(() => {
          this.logger.warn(
            "NOTE: Pulling image for the first time. Please be patient."
          );
          return this._pullImage();
        });
      })
      .then(() => {
        this.logger.info(`Launching docker image '${this.image}'`);
        return runProcess(this.dockerRunCommand);
      })
      .then((process) => {
        this.process = process;
        this.emit("processCreated");

        if (this.debug) {
          this.process.stdout?.on("data", (data) => {
            this.logger.log(data.toString());
          });

          this.process.stderr?.on("data", (data) => {
            this.logger.error(data.toString());
          });

          this.dockerEventsListener.once("container.start", (event) => {
            this.logger.info(
              "Container started:",
              JSON.stringify(event, null, 4)
            );
          });

          this.dockerEventsListener.once("container.stop", (event) => {
            this.logger.info(
              "Container stopped:",
              JSON.stringify(event, null, 4)
            );
          });
        }

        return this._reportWhenDockerIsRunning().then(() => {
          this.logger.info("Docker container is ready");
          return process;
        });
      })
      .catch((err) => {
        if (err.code === "ENOENT") {
          return Promise.resolve();
        }

        throw err;
      });
  }

  /**
   * @return {Promise}
   */
  stop() {
    return this._removeStaleContainer().then(() => {
      if (this.process) {
        this.process.kill(this.process.pid);
        this.process = null;
      }

      this.logger.info("Docker container has stopped");
      this.dockerEventsListener.disconnect();
    });
  }

  /**
   * Polls for availability of application running in a docker
   * @return {Promise<any>}
   * @private
   */
  _reportWhenDockerIsRunning() {
    const {
      url,
      maxRetries = MAX_INSPECT_ATTEMPTS,
      inspectInterval = INSPECT_DOCKER_INTERVAL,
      startDelay = 0,
    } = this.healthCheck as HealthCheckArgs;

    if (url === undefined) {
      return Promise.resolve();
    }

    const waitForDockerHealthCheck = new Promise<void>((resolve) => {
      this.dockerEventsListener.on("container.health_status", (event) => {
        if (event.args === "healthy") {
          resolve();
        }
      });
    });

    const waitForHealthCheckPoll = Docker.delay(startDelay).then(
      () =>
        new Promise<void>((resolve, reject) => {
          let attempts = 0;
          let pollstatus: NodeJS.Timeout | number | null = null;

          const poll = () => {
            Ping(new URL(url))
              .then(() => {
                resolve();
                clearTimeout(pollstatus as number);
                pollstatus = null;
              })
              .catch((err) => {
                attempts++;
                if (attempts >= maxRetries) {
                  clearTimeout(pollstatus as number);
                  pollstatus = null;
                  reject(err);
                  return;
                }

                pollstatus = setTimeout(poll, inspectInterval);
              });
          };

          pollstatus = setTimeout(poll, inspectInterval);
        })
    );

    return Promise.race([waitForDockerHealthCheck, waitForHealthCheckPoll]);
  }

  /**
   * @return {Promise}
   * @private
   */
  _isImagePresent() {
    return runCommand(["docker", "inspect", this.image]);
  }

  /**
   * @return {Promise}
   * @private
   */
  _pullImage() {
    return runCommand(["docker", "pull", this.image]);
  }

  /**
   * Removes any stale docker image
   */
  _removeStaleContainer() {
    return fs
      .readFile(this.cidfile)
      .then((cid) => {
        this.logger.info("Shutting down running container");
        return Docker.stopContainer(cid.toString()).then(() =>
          Docker.removeContainer(cid.toString())
        );
      })
      .catch(() => Promise.resolve())
      .then(() => {
        this.logger.info("Cleaning up CID files");
        return fs.remove(this.cidfile);
      });
  }

  static delay(timeMs: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeMs);
    });
  }

  static stopContainer(/** Container ID */ cid: string) {
    return runCommand(["docker", "stop", cid]);
  }


  static removeContainer(/** Container ID */ cid: string) {
    return runCommand(["docker", "rm", cid]);
  }
}

export default Docker;
