import * as url from 'url';
import { join } from 'path';
import DockerLauncher, { DockerLauncherConfig } from '@root/launcher.ts';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const config: DockerLauncherConfig = {
    specs: ['*.spec.ts'],
    runner: 'local',
    capabilities: [{
        browserName: 'chrome',
        acceptInsecureCerts: true,
        'goog:chromeOptions': {
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--headless',
                '--disable-gpu',
                // '--remote-debugging-pipe',
            ],
        }
    }],

    baseUrl: 'http://127.0.0.1:8080',
    logLevel: 'debug',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
    },
    reporters: ['spec'],
    services: [[DockerLauncher, {}]],
    dockerLogs: './',
    dockerOptions: {
        image: 'nginx',
        healthCheck: 'http://host.docker.internal:8080',
        options: {
            p: ['8080:8080'],
            shmSize: '2g',
            v: [
                `${join(__dirname, '/app/')}:/usr/share/nginx/html:ro`,
                `${join(__dirname, '/nginx.conf')}:/etc/nginx/nginx.conf:ro`
            ],
            healthCmd: '"curl -sS http://127.0.0.1:8080 || exit 1"',
            healthTimeout: '10s',
            healthRetries: 3,
            healthInterval: '5s'
        }
    }
};
