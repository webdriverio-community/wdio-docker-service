/*! launcher.js */

const fs = require("fs-extra");
const Docker = require("dockerode");
const DEFAULT_LOG_FILENAME = "docker-log.txt";
const DEFAULT_OPTIONS = {
    containers: [{
        tag: "selenium/standalone-chrome",
        cmd: [],
        options: { port: 4444 }
    }]
};

class DockerLauncher {
    constructor() {
        this.log = [];
        this.containers = [];
    }

    onPrepare(config) {
        const { containers = [] } = config;
        this.containers = containers.length ? containers : DEFAULT_OPTIONS.containers;

        const containerPromises = this.containers.map((containerConfig) => {
            const docker = new Docker(containerConfig.options);
            const commands = containerConfig.cmd || [];

            return docker.run(containerConfig.tag, commands, process.stdout)
                .then((container) => {
                    this.containers.push(container);
                })
                .catch((err) => {
                    this.log.push(err.message);
                });
        });

        return Promise.all(containerPromises);
    }

    onComplete() {
        while (this.containers.length) {
            this.containers.pop().remove();
        }

        if (this.log.length) {
            fs.writeFile(DEFAULT_LOG_FILENAME, this.log.join("\n"), "utf8");
        }
    }
}

module.exports = DockerLauncher;
