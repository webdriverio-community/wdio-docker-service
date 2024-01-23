import { expect } from 'chai';
import { stub, spy, SinonStub, SinonSpy } from 'sinon';
import { DockerLauncherForTests as DockerLauncher } from '@/launcher.js';
import Docker from '@/utils/docker.js';

describe('DockerLauncher', async function () {
    let launcher: typeof DockerLauncher.prototype;
    let stubRun: SinonStub<Parameters<typeof Docker.prototype.run>>;

    beforeEach(function () {
        launcher = new DockerLauncher();
        stubRun = stub(Docker.prototype, 'run').resolves();
    });

    afterEach(function () {
        stubRun.restore();
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
                const dockerOptions = {};
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
                    const dockerOptions = {
                        image: 'my-image',
                    };

                    // @ts-expect-error - Testing invalid config
                    await launcher.onPrepare({ dockerOptions });
                    expect(launcher.docker).to.be.instanceOf(Docker);
                    expect(launcher.docker?.image).to.eql('my-image');
                });
            });

            context('when dockerOptions.args is provided', function () {
                it('must run docker with args', async function () {
                    const dockerOptions = {
                        image: 'my-image',
                        args: '-foo',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                    });
                    expect(launcher.docker?.args).to.eql('-foo');
                });
            });

            context('when dockerOptions.command is provided', function () {
                it('must run docker with command', async function () {
                    const dockerOptions = {
                        image: 'my-image',
                        command: '/bin/bash',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                    });
                    expect(launcher.docker?.command).to.eql('/bin/bash');
                });
            });

            context('when dockerOptions.healthCheck is provided', function () {
                it('must run docker with healthCheck', async function () {
                    const dockerOptions = {
                        image: 'my-image',
                        healthCheck: 'http://localhost:8000',
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
                    });
                    expect(launcher.docker?.healthCheck).to.eql({
                        url: 'http://localhost:8000',
                    });
                });
            });

            context('when dockerOptions.options are provided', function () {
                it('must run docker with options', async function () {
                    const dockerOptions = {
                        image: 'my-image',
                        options: {
                            e: ['TEST=ME'],
                        },
                    };

                    await launcher.onPrepare({
                        dockerOptions,
                        capabilities: [],
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
                    const dockerOptions = {
                        image: 'my-image',
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
                    const config = {
                        dockerOptions: {
                            image: 'my-image',
                        },
                        capabilities: [],
                    };

                    await launcher.onPrepare(config);
                    expect(stubRedirectLogStream.called).to.eql(false);
                });
            });

            context('when set to string', function () {
                it('must redirect log stream', async function () {
                    const config = {
                        dockerLogs: './',
                        dockerOptions: {
                            image: 'my-image',
                        },
                        capabilities: [],
                    };

                    await launcher.onPrepare(config);
                    launcher.docker?.emit('processCreated');
                    expect(stubRedirectLogStream.called).to.eql(true);
                });
            });
        });

        describe('@onDockerReady', function () {
            context('when onDockerReady is provided', function () {
                const config = {
                    onDockerReady: spy(),
                    dockerOptions: {
                        image: 'my-image',
                    },
                    capabilities: [],
                };

                it('must call onDockerReady', async function () {
                    await launcher.onPrepare(config);
                    expect(config.onDockerReady.called).to.eql(true);
                });
            });

            context('when docker run is rejected', function () {
                const config = {
                    onDockerReady: spy(),
                    dockerOptions: {
                        image: 'my-image',
                    },
                    capabilities: [],
                };
                let stubRun: SinonStub<Parameters<typeof Docker.prototype.run>>;

                beforeEach(function () {
                    stubRun.restore();
                    stubRun = stub(Docker.prototype, 'run').rejects(new Error('Fail'));
                });

                it('must NOT call onDockerReady', async function () {
                    try {
                        return await launcher.onPrepare(config);
                    } catch {
                        expect(config.onDockerReady.called).to.eql(false);
                    }
                });
            });
        });
    });

    describe('#onComplete', function () {
        let spyStop: SinonSpy<Parameters<typeof Docker.prototype.stop>>;

        beforeEach(function () {
            spyStop = spy(Docker.prototype, 'stop');
        });

        afterEach(function () {
            spyStop.restore();
        });

        context('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.onComplete();
                expect(spyStop.called).to.eql(true);
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
        let spyStop: SinonSpy<Parameters<typeof Docker.prototype.stop>>;

        beforeEach(function () {
            spyStop = spy(Docker.prototype, 'stop');
        });

        afterEach(function () {
            spyStop.restore();
        });

        context('when this.docker is present', function () {
            it('must call this.docker.stop', function () {
                launcher.afterSession();
                expect(spyStop.called).to.eql(true);
            });
        });
    });
});
