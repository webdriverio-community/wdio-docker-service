import * as url from 'url';
import { join } from 'path';
// TODO: Investigate why path alias won't work here
import DockerLauncher, { DockerLauncherConfig } from '@/launcher.ts';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const config: DockerLauncherConfig = {
    hostname: '127.0.0.1',
    specs: ['./*.spec.ts'],
    path: '/wd/hub',
    runner: 'local',
    capabilities: [{
        browserName: 'chrome',
        browserVersion: '120.0-chromedriver-120.0',
    }],
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: join(__dirname, 'tsconfig.json'),
            // @ts-expect-error swc property needs to be added to type definition
            swc: true,
        },
    },

    baseUrl: 'http://webdriver.io',
    logLevel: 'debug',

    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
    },
    reporters: ['spec'],
    // Based on types, I should be able to pass [DockerLauncher] here, but it doesn't work
    services: [[DockerLauncher, {}]],
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
