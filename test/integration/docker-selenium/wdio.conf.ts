import type { DockerLauncherConfig } from '@root/launcher.ts'
import DockerLauncher from '@root/launcher.ts'

const host = process.env.CI ? 'localhost' : 'host.docker.internal'

export const config: DockerLauncherConfig = {
    port: 4444,
    specs: ['./*.spec.ts'],
    runner: 'local',
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--headless',
                '--remote-debugging-pipe',
            ],
        }
    }],

    baseUrl: 'http://webdriver.io',
    logLevel: 'info',

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
        image: 'selenium/standalone-chrome:136.0.7103.113-20251101',
        healthCheck: `http://${host}:4444`,
        options: {
            addHost: ['host.docker.internal:host-gateway'],
            p: ['4444:4444'],
            shmSize: '2g',
            env: ['SE_NODE_MAX_SESSION=4', 'SE_NODE_OVERRIDE_MAX_SESSION=true'],
            noHealthcheck: true
        },
    }
}
