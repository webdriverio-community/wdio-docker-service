const path = require('path');

exports.config = {
    host: 'localhost',
    specs: [
        './test/integration/docker-app/*.spec.js'
    ],

    capabilities: [{
        browserName: 'chrome',
        chromeOptions: {
            args: ['--headless', '--disable-gpu']
        }
    }],

    debug: false,
    sync: true,
    // logLevel: 'verbose',
    coloredLogs: true,

    baseUrl: 'http://localhost:8080',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd'
    },
    reporters: ['spec'],
    services: [
        'selenium-standalone',
        require('../../../launcher')
    ],
    dockerLogs: './',
    dockerOptions: {
        image: 'nginx',
        healthCheck: 'http://localhost:8080',
        options: {
            p: ['8080:8080'],
            v: [
                `${ path.join(__dirname, '/app/') }:/usr/share/nginx/html:ro`,
                `${ path.join(__dirname, '/nginx.conf') }:/etc/nginx/nginx.conf:ro`
            ]
        }
    }
};
