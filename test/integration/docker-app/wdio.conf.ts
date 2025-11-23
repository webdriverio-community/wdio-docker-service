import * as url from 'node:url'
import { join } from 'node:path'
import type { DockerLauncherConfig } from '@root/launcher.ts'
import DockerLauncher from '@root/launcher.ts'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
const isCI = !!process.env.CI
const host = isCI ? '127.0.0.1' : 'host.docker.internal'

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
        exit: true,
    },
    reporters: ['spec'],
    services: [[DockerLauncher, {}]],
    dockerLogs: './',
    dockerOptions: {
        image: 'nginx',
        healthCheck: `http://${host}:8080`,
        options: {
            // Use host networking only on CI
            ...(isCI ? { network: 'host' as const } : { p: ['8080:8080'] }),
            shmSize: '2g',
            v: [
                `${join(__dirname, '/app/')}:/usr/share/nginx/html:ro`,
                `${join(__dirname, '/nginx.conf')}:/etc/nginx/nginx.conf:ro`,
            ],
            rm: false,
        },
    }
}
