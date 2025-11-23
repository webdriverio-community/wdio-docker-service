import * as url from 'node:url'
import { join } from 'node:path'
import type { DockerLauncherConfig } from '@root/launcher.ts'
import DockerLauncher from '@root/launcher.ts'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const host = process.env.CI ? '127.0.0.1' : 'host.docker.internal'

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

    baseUrl: `http://${host}:8080`,
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
        healthCheck: `http://${host}:8080`,
        options: {
            addHost: ['host.docker.internal:host-gateway'],
            p: ['8080:8080'],
            shmSize: '2g',
            v: [
                `${join(__dirname, '/app/')}:/usr/share/nginx/html:ro`,
                `${join(__dirname, '/nginx.conf')}:/etc/nginx/nginx.conf:ro`
            ],
            healthCmd: '"curl -sS http://host.docker.internal:8080 || exit 1"',
            healthTimeout: '10s',
            healthRetries: 3,
            healthInterval: '5s'
        }
    }
}
