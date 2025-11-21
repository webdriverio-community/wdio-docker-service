import type { Capabilities, Options, Services } from '@wdio/types' with { 'resolution-mode': 'import' };
import type { DockerLauncherConfig } from '../launcher.js' with { 'resolution-mode': 'import' };

export default class DockerLauncher implements Services.ServiceInstance {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private instance: any;

    constructor(
        public options?: Services.ServiceOption,
        public capabilities?: Capabilities.ResolvedTestrunnerCapabilities,
        public config?: Options.WebdriverIO
    ) {}

    async onPrepare(config: DockerLauncherConfig, capabilities: Capabilities.TestrunnerCapabilities) {
        const { default: DockerLauncher } = await import('../launcher.js');
        this.instance = new DockerLauncher(this.options, this.capabilities, this.config);
        return this.instance.onPrepare(config, capabilities);
    }

    async onComplete(exitCode: number, config: DockerLauncherConfig, capabilities: Capabilities.TestrunnerCapabilities) {
        if (this.instance) {
            return this.instance.onComplete(exitCode, config, capabilities);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async afterSession(config: DockerLauncherConfig, capabilities: any, specs: string[]) {
        if (this.instance) {
            return this.instance.afterSession(config, capabilities, specs);
        }
    }
}

export const launcher = DockerLauncher;