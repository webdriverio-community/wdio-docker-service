const path = require('path');
const DockerLauncher = require('../../../lib/launcher');

exports.config = {
    host: 'localhost',
    specs: [
        './test/integration/docker-app/*.spec.js'
    ],
    runner: 'local',
    capabilities: [{
        browserName: 'chrome',
        acceptInsecureCerts: true,
        'goog:chromeOptions': {
            args: ['--headless', '--disable-gpu'],
        }
    }],

    baseUrl: 'http://localhost:8080',
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
        'chromedriver',
        [new DockerLauncher()]
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
            ],
            healthCmd: '"curl -sS http://127.0.0.1:8080 || exit 1"',
            healthTimeout: '10s',
            healthRetries: 3,
            healthInterval: '5s'
        }
    }
};
