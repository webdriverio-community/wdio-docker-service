import { expect } from 'chai';
import { stub, spy, createSandbox, SinonStub, SinonSpy, SinonSandbox } from 'sinon';
import { DockerLauncherForTests as DockerLauncher, DockerLauncherConfig } from '@/launcher.js';
import Docker from '@/utils/docker.js';

describe('DockerLauncher', async function () {
    let launcher: typeof DockerLauncher.prototype;

    beforeEach(function () {
        launcher = new DockerLauncher();
    });

    afterEach(function () {
        launcher.onComplete();
    });

    describe('#constructor', function () {
        it('must initialize class properties', function () {
            expect(launcher.docker).to.eql(null);
            expect(launcher.dockerLogs).to.eql(null);
            expect(launcher.logToStdout).to.eql(false);
        });
    });

    describe('#onPrepare', function () {
        describe('@dockerOptions', function () {
            context('when dockerOptions.image is not provided', function () {
                // @ts-expect-error - Testing invalid config
                const dockerOptions: DockerLauncherConfig['dockerOptions'] = {};

                it('must reject with error', async function () {
                    try {
                        // @ts-expect-error - Testing invalid config
                        return await launcher.onPrepare({ dockerOptions });
                    } catch (err) {
                        expect(err).to.be.instanceOf(Error);
                        expect((err as Error).message).to.eql(
                            'dockerOptions.image is a required property'
                        );
                    }
                });
            });

            context('when dockerOptions.image is provided', function () {
                it('must run docker', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                    };

                    // @ts-expect-error - Testing invalid config
                    await launcher.onPrepare({ dockerOptions, logLevel: 'error' });
                    expect(launcher.docker).to.be.instanceOf(Docker);
                    expect(launcher.docker?.image).to.eql('hello-world');
                });
            });

            context('when dockerOptions.args is provided', function () {
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
                    expect(launcher.docker?.args).to.eql('-foo');
                });
            });

            context('when dockerOptions.command is provided', function () {
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
                    expect(launcher.docker?.command).to.eql('/bin/bash');
                });
            });

            context('when dockerOptions.healthCheck is provided', function () {
                it('must run docker with healthCheck', function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                        healthCheck: 'http://localhost:8000',
                    };

                    // Consider moving this to async/await but ensure expect can be called after the promise resolves
                    launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                        logLevel: 'error'
                    }).then(() => {
                        expect(launcher.docker?.healthCheck).eql({
                            url: 'http://localhost:8000',
                        });
                    });
                });
            });

            context('when dockerOptions.options are provided', function () {
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
                    expect(launcher.docker?.options).to.deep.equal({
                        rm: true,
                        e: ['TEST=ME'],
                        cidfile: launcher.docker?.cidfile,
                    });
                });
            });

            context('when logLevel is set to debug', function () {
                it('must set debug property of Docker to true', async function () {
                    const dockerOptions: DockerLauncherConfig['dockerOptions'] = {
                        image: 'hello-world',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        logLevel: 'debug',
                        capabilities: [],
                    });
                    expect(launcher.docker?.debug).to.be.true;
                });
            });
        });

        describe('@dockerLogs', function () {
            let stubRedirectLogStream: SinonStub<
                Parameters<typeof DockerLauncher.prototype._redirectLogStream>
            >;
            beforeEach(function () {
                stubRedirectLogStream = stub(
                    DockerLauncher.prototype,
                    '_redirectLogStream'
                );
            });

            afterEach(function () {
                stubRedirectLogStream.restore();
            });

            context('when not set', function () {
                it('must not redirect log stream', async function () {
                    const config: DockerLauncherConfig = {
                        dockerOptions: {
                            image: 'hello-world',
                        },
                        capabilities: [],
                        logLevel: 'error'
                    };

                    await launcher.onPrepare(config);
                    expect(stubRedirectLogStream.called).to.eql(false);
                });
            });

            context('when set to string', function () {
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
                    expect(stubRedirectLogStream.called).to.eql(true);
                });
            });
        });

        describe('@onDockerReady', function () {
            context('when onDockerReady is provided', function () {
                const sandbox: SinonSandbox = createSandbox();
                const onDockerReady: SinonSpy = sandbox.spy();
                const config: DockerLauncherConfig = {
                    onDockerReady,
                    dockerOptions: {
                        image: 'hello-world',
                    },
                    capabilities: [],
                    logLevel: 'error'
                };

                it('must call onDockerReady', async function () {
                    await launcher.onPrepare(config);
                    expect(onDockerReady.called).eq(true);
                });
            });

            context('when docker run is rejected', function () {
                let sandbox: SinonSandbox;
                const onDockerReady: SinonSpy = spy();
                const config: DockerLauncherConfig = {
                    onDockerReady,
                    dockerOptions: {
                        image: 'hello-world',
                    },
                    capabilities: [],
                    logLevel: 'silent'
                };

                beforeEach(function () {
                    sandbox = createSandbox();
                    sandbox.stub(Docker.prototype, 'run').rejects(new Error('Fail'));
                });

                afterEach(() => {
                    sandbox.restore();        
                });

                it('must NOT call onDockerReady', async function () {
                    try {
                        return await launcher.onPrepare(config);
                    } catch {
                        expect(onDockerReady.called).equal(false);
                    }
                });
            });
        });
    });

    describe('#onComplete', function () {
        let sandbox: SinonSandbox;
        let spyStop: SinonSpy;

        beforeEach(function () {
            sandbox = createSandbox();
            spyStop = sandbox.stub();
            // @ts-expect-error - Hacking to test private property
            launcher.docker = { stop: spyStop } as unknown as Docker;
        });

        afterEach(function () {
            sandbox.restore();
        });

        context('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.onComplete();
                expect(spyStop.called).equal(true);
            });
        });

        context('when this.watchMode is present', function () {
            it('must not call this.docker.stop', function () {
                launcher.watchMode = true;
                launcher.onComplete();
                expect(spyStop.called).to.eql(false);
            });
        });
    });

    describe('#afterSession', function () {
        let sandbox: SinonSandbox;
        let spyStop: SinonSpy;

        beforeEach(function () {
            sandbox = createSandbox();
            spyStop = sandbox.stub();
            // @ts-expect-error - Hacking for testing purposes
            launcher.docker = { 
                stop: spyStop,
                process: { connected: true },
            } as unknown as Docker;
        });

        afterEach(function () {
            sandbox.restore();
        });

        context('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.afterSession();
                expect(spyStop.called).equal(true);
            });
        });
    });
});
