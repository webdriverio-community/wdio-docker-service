import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import { DockerLauncherForTests as DockerLauncher, DockerLauncherConfig } from '@root/launcher.js';
import Docker from '@root/utils/docker.js';

vi.mock('@root/utils/docker.js', () => {
    class Docker {
        image: string;
        args: string | undefined;
        command: string | undefined;
        healthCheck: any;
        options: any;
        debug: boolean;
        cidfile: string;
        listeners: Record<string, any> = {};

        constructor(image: string, { options = {}, healthCheck = {}, command, args, debug = false }: { options?: Record<string, any>, healthCheck?: string | { url: string } | Record<string, never>, command?: string, args?: string, debug?: boolean } = {}) {
            this.image = image;
            this.args = args;
            this.command = command;
            this.debug = debug;
            this.healthCheck = typeof healthCheck === 'string' ? { url: healthCheck } : healthCheck;
            this.cidfile = 'mock-cid-file';
            this.options = {
                rm: true,
                cidfile: this.cidfile,
                ...options
            };
        }

        run() { return Promise.resolve(null); }
        stop() { return Promise.resolve(null); }
        on(event: string, cb: (...args: any[]) => void) {}
        once(event: string, cb: (...args: any[]) => void) { this.listeners[event] = cb; }
        emit(event: string) { if (this.listeners[event]) this.listeners[event](); }
        removeListener(event: string, cb: (...args: any[]) => void) {}
        removeAllListeners() {}
    }

    Docker.prototype.run = vi.fn().mockResolvedValue(null);
    Docker.prototype.stop = vi.fn().mockResolvedValue(null);
    Docker.prototype.on = vi.fn();
    Docker.prototype.once = vi.fn().mockImplementation(function(this: Docker, event: string, cb: (...args: any[]) => void) {
        this.listeners[event] = cb;
    });
    Docker.prototype.emit = vi.fn().mockImplementation(function(this: Docker, event: string) {
        if (this.listeners[event]) {
            this.listeners[event]();
        }
    });
    Docker.prototype.removeListener = vi.fn();
    Docker.prototype.removeAllListeners = vi.fn();

    return { default: Docker };
});

describe('DockerLauncher', function () {
    let launcher: typeof DockerLauncher.prototype;

    beforeEach(function () {
        launcher = new DockerLauncher();
    });

    afterEach(function () {
        launcher.onComplete();
        vi.restoreAllMocks();
    });

    describe('#constructor', function () {
        it('must initialize class properties', function () {
            expect(launcher.docker).toEqual(null);
            expect(launcher.dockerLogs).toEqual(null);
            expect(launcher.logToStdout).toEqual(false);
        });
    });

    describe('#onPrepare', function () {
        describe('@dockerOptions', function () {
            describe('when dockerOptions.image is not provided', function () {
                // @ts-expect-error - Testing invalid config
                const dockerOptions: DockerLauncherConfig['dockerOptions'] = {};

                it('must reject with error', async function () {
                    try {
                        // @ts-expect-error - Testing invalid config
                        await launcher.onPrepare({ dockerOptions });
                    } catch (err) {
                        expect(err).toBeInstanceOf(Error);
                        expect((err as Error).message).toEqual(
                            'dockerOptions.image is a required property'
                        );
                    }
                });
            });

            describe('when dockerOptions.image is provided', function () {
                it('must run docker', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                    };

                    // @ts-expect-error - Testing invalid config
                    await launcher.onPrepare({ dockerOptions, logLevel: 'error' });
                    expect(launcher.docker).toBeInstanceOf(Docker);
                    expect(launcher.docker?.image).toEqual('hello-world');
                });
            });

            describe('when dockerOptions.args is provided', function () {
                it('must run docker with args', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                        args: '-foo',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                        logLevel: 'error'
                    });
                    expect(launcher.docker?.args).toEqual('-foo');
                });
            });

            describe('when dockerOptions.command is provided', function () {
                it('must run docker with command', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                        command: '/bin/bash',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                        logLevel: 'error'
                    });
                    expect(launcher.docker?.command).toEqual('/bin/bash');
                });
            });

            describe('when dockerOptions.healthCheck is provided', function () {
                it('must run docker with healthCheck', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                        healthCheck: 'http://localhost:8000',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                        logLevel: 'error'
                    });
                    expect(launcher.docker?.healthCheck).toEqual({
                        url: 'http://localhost:8000',
                    });
                });
            });

            describe('when dockerOptions.options are provided', function () {
                it('must run docker with options', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                        options: {
                            e: ['TEST=ME'],
                        },
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                        logLevel: 'error'
                    });
                    expect(launcher.docker?.options).toEqual({
                        rm: true,
                        e: ['TEST=ME'],
                        cidfile: launcher.docker?.cidfile,
                    });
                });
            });

            describe('when logLevel is set to debug', function () {
                it('must set debug property of Docker to true', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        logLevel: 'debug',
                        capabilities: [],
                    });
                    expect(launcher.docker?.debug).toBe(true);
                });
            });
        });

        describe('@dockerLogs', function () {
            let stubRedirectLogStream: MockInstance;
            beforeEach(function () {
                stubRedirectLogStream = vi.spyOn(
                    DockerLauncher.prototype,
                    '_redirectLogStream'
                ).mockImplementation(() => Promise.resolve());
            });

            afterEach(function () {
                stubRedirectLogStream.mockRestore();
            });

            describe('when not set', function () {
                it('must not redirect log stream', async function () {
                    const config: DockerLauncherConfig = {
                        dockerOptions: {
                            image: 'hello-world',
                        },
                        capabilities: [],
                        logLevel: 'error'
                    };

                    await launcher.onPrepare(config);
                    expect(stubRedirectLogStream).not.toHaveBeenCalled();
                });
            });

            describe('when set to string', function () {
                it('must redirect log stream', async function () {
                    const config: DockerLauncherConfig = {
                        dockerLogs: './',
                        dockerOptions: {
                            image: 'hello-world',
                        },
                        capabilities: [],
                        logLevel: 'error'
                    };

                    await launcher.onPrepare(config);
                    launcher.docker?.emit('processCreated');
                    expect(stubRedirectLogStream).toHaveBeenCalled();
                });
            });
        });

        describe('@onDockerReady', function () {
            let onDockerReady: MockInstance;
            let config: DockerLauncherConfig;

            beforeEach(function () {
                onDockerReady = vi.fn();
                // Docker.prototype.run is already mocked by vi.mock
                config = {
                    onDockerReady: onDockerReady as unknown as () => void,
                    dockerOptions: {
                        image: 'hello-world',
                    },
                    capabilities: [],
                    logLevel: 'error'
                };
            });

            describe('when onDockerReady is provided', function () {
                it('must call onDockerReady', async function () {
                    await launcher.onPrepare(config);
                    expect(onDockerReady).toHaveBeenCalled();
                });
            });

            describe('when docker run is rejected', function () {
                beforeEach(function () {
                    // Override the mock for this context
                    (Docker.prototype.run as unknown as MockInstance).mockRejectedValue(new Error('Fail'));
                    config.logLevel = 'silent';
                });

                afterEach(function () {
                    (Docker.prototype.run as unknown as MockInstance).mockResolvedValue(undefined);
                });

                it('must NOT call onDockerReady', async function () {
                    try {
                        await launcher.onPrepare(config);
                    } catch {
                        expect(onDockerReady).not.toHaveBeenCalled();
                    }
                });
            });
        });
    });

    describe('#onComplete', function () {
        let spyStop: MockInstance;

        beforeEach(function () {
            spyStop = vi.fn();
            // @ts-expect-error - Hacking to test private property
            launcher.docker = { stop: spyStop } as unknown as Docker;
        });

        describe('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.onComplete();
                expect(spyStop).toHaveBeenCalled();
            });
        });

        describe('when this.watchMode is present', function () {
            it('must not call this.docker.stop', function () {
                launcher.watchMode = true;
                launcher.onComplete();
                expect(spyStop).not.toHaveBeenCalled();
            });
        });
    });

    describe('#afterSession', function () {
        let spyStop: MockInstance;

        beforeEach(function () {
            spyStop = vi.fn();
            // @ts-expect-error - Hacking for testing purposes
            launcher.docker = { 
                stop: spyStop,
                process: { connected: true },
            } as unknown as Docker;
        });

        describe('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.afterSession();
                expect(spyStop).toHaveBeenCalled();
            });
        });
    });
});
