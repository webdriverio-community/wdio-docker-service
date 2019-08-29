const DockerLauncher = require('../../../lib/launcher');

exports.config = {
    host: 'localhost',
    specs: [
        './test/integration/docker-selenium/*.spec.js'
    ],
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
        ui: 'bdd'
    },
    reporters: ['spec'],
    services: [
        [new DockerLauncher()]
    ],
    dockerLogs: './',
    dockerOptions: {
        image: 'selenium/standalone-chrome',
        healthCheck: 'http://localhost:4444',
        options: {
            p: ['4444:4444'],
            shmSize: '2g'
        }
    }
};
