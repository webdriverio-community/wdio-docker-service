import { join } from 'path';
import DockerLauncher from '../../../lib/launcher.js';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const config = {
    host: '127.0.0.1',
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

    baseUrl: 'http://127.0.0.1:8080',
    logLevel: 'debug',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd'
    },
    reporters: ['spec'],
    browserName: 'chrome',
    browserVersion: '118.0-chromedriver-118.0',
    services: [
        [DockerLauncher]
    ],
    dockerLogs: './',
    dockerOptions: {
        image: 'nginx',
        healthCheck: 'http://127.0.0.1:8080',
        options: {
            p: ['8080:8080'],
            v: [
                `${ join(__dirname, '/app/') }:/usr/share/nginx/html:ro`,
                `${ join(__dirname, '/nginx.conf') }:/etc/nginx/nginx.conf:ro`
            ],
            healthCmd: '"curl -sS http://127.0.0.1:8080 || exit 1"',
            healthTimeout: '10s',
            healthRetries: 3,
            healthInterval: '5s'
        }
    }
};
