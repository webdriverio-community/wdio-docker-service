import DockerLauncher, { DockerLauncherConfig } from '../../../src/launcher.js';

export const config: DockerLauncherConfig = {
    hostname: '127.0.0.1',
    specs: [
        './test/integration/docker-selenium/*.spec.ts'
    ],
    path: '/wd/hub',
    runner: 'local',
    capabilities: [{
        browserName: 'chrome'
    }],

    baseUrl: 'http://webdriver.io',
    logLevel: 'debug',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        compilers: ['ts-node/esm'],
    },
    reporters: ['spec'],
    services: [
        DockerLauncher
    ],
    dockerLogs: './',
    dockerOptions: {
        image: 'selenium/standalone-chrome',
        healthCheck: 'http://127.0.0.1:4444',
        options: {
            p: ['4444:4444', '7900:7900'],
            shmSize: '2g'
        }
    }
};
