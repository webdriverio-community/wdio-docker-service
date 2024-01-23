import * as url from 'url';
import { join } from 'path';
// TODO: Investigate why path alias won't work here
import DockerLauncher, { DockerLauncherConfig } from '@/launcher.ts';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const config: DockerLauncherConfig = {
    hostname: '127.0.0.1',
    port: 8080,
    specs: ['*.spec.ts'],
    runner: 'local',
    capabilities: [{
        browserName: 'chrome',
        browserVersion: '120.0-chromedriver-120.0',
        acceptInsecureCerts: true,
        'goog:chromeOptions': {
            args: ['headless', 'disable-gpu'],
        }
    }],
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            project: join(__dirname, 'tsconfig.json'),
            // @ts-expect-error swc property needs to be added to root type definition
            swc: true,
        },
    },

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
    // Based on types, I should be able to pass [DockerLauncher] here, but it doesn't work
    services: [[DockerLauncher, {}]],
    dockerLogs: './',
    dockerOptions: {
        image: 'nginx',
        healthCheck: 'http://127.0.0.1:8080',
        options: {
            p: ['8080:8080'],
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
