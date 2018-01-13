exports.config = {
    host: 'localhost',
    specs: [
        './test/integration/docker-selenium/*.spec.js'
    ],

    capabilities: [{
        browserName: 'chrome'
    }],

    debug: false,
    sync: true,
    // logLevel: 'verbose',
    coloredLogs: true,

    baseUrl: 'http://webdriver.io',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd'
    },
    reporters: ['spec'],
    services: [
        require('../../../launcher')
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
