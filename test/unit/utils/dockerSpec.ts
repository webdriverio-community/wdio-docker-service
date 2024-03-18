import path from 'path';
import fs from 'fs-extra';
import { expect } from 'chai';
import { stub, spy, createSandbox, SinonStub, SinonSpy, SinonSandbox } from 'sinon';
import * as ChildProcess from '@/utils/childProcess.js';
import { DockerForTests as Docker } from '@/utils/docker.js';
import DockerEventsListener from '@/utils/dockerEventsListener.js';

describe('Docker', function () {
    const SPACE = ' ';

    describe('#constructor', function () {
        context('when image argument is not provided', function () {
            const tryToInstantiate = () => {
                // @ts-expect-error Checking for error case here
                new Docker();
            };

            it('must throw an error', function () {
                expect(tryToInstantiate).to.throw();
            });
        });

        context('when image argument is provided', function () {
            context('when optional arguments are not provided', function () {
                it('must use defaults', function () {
                    const docker = new Docker('my-image');
                    const cidfile = path.join(process.cwd(), 'my_image.cid');

                    expect(docker.args).to.eql(undefined);
                    expect(docker.cidfile).to.eql(cidfile);
                    expect(docker.command).to.eql(undefined);
                    expect(docker.debug).to.eql(false);
                    expect(docker.healthCheck).to.eql({});
                    expect(docker.logger).to.eql(console);
                    expect(docker.process).to.eql(null);
                    expect(docker.options).to.eql({
                        rm: true,
                        cidfile,
                    });
                });
            });

            context('when docker options are set', function () {
                it('must properly translate them into a docker run command', function () {
                    const docker = new Docker('my-image', {
                        options: {
                            d: true,
                            p: ['1234:1234'],
                            // @ts-expect-error allowing unknown options
                            foo: 'bar',
                        },
                    });

                    expect(docker.dockerRunCommand.join(SPACE)).to.eql(
                        `docker run --cidfile ${docker.cidfile} --rm -d -p 1234:1234 --foo bar my-image`
                    );
                });
            });

            context('when docker command argument is provided ', function () {
                it('must place it after image name ', function () {
                    const docker = new Docker('my-image', { command: 'test' });

                    expect(docker.dockerRunCommand.join(SPACE)).to.eql(
                        `docker run --cidfile ${docker.cidfile} --rm my-image test`
                    );
                });
            });

            context('when docker args argument is provided ', function () {
                it('must place it after image name ', function () {
                    const docker = new Docker('my-image', { args: '-foo' });

                    expect(docker.dockerRunCommand.join(SPACE)).to.eql(
                        `docker run --cidfile ${docker.cidfile} --rm my-image -foo`
                    );
                });
            });

            context('when both command and args arguments are provided', function () {
                it('must place both of them after image name where command is followed by args', function () {
                    const docker = new Docker('my-image', {
                        command: 'test',
                        args: '-foo',
                    });
                    expect(docker.dockerRunCommand.join(SPACE)).to.eql(
                        `docker run --cidfile ${docker.cidfile} --rm my-image test -foo`
                    );
                });
            });

            context('when CWD contains spaces', function () {
                let stubCwd: SinonStub<Parameters<typeof process.cwd>>;

                beforeEach(function () {
                    stubCwd = stub(process, 'cwd').returns('/User/johndoe/test dir/');
                });

                afterEach(function () {
                    stubCwd.restore();
                });

                it('must escape cidfile path', function () {
                    const docker = new Docker('my-image', {
                        command: 'test',
                        args: '-foo',
                    });
                    const cmd =
                        process.platform === 'win32'
                            ? 'docker run --cidfile \\User\\johndoe\\test dir\\my_image.cid --rm my-image test -foo'
                            : 'docker run --cidfile /User/johndoe/test\\ dir/my_image.cid --rm my-image test -foo';
                    expect(docker.dockerRunCommand.join(SPACE)).to.eql(cmd);
                });
            });
        });
    });

    describe('#stop', function () {
        const killSpy = spy();
        const mockProcess = {
            kill: killSpy,
        };
        let stubRemoveStaleContainer: SinonStub<Parameters<typeof Docker.prototype._removeStaleContainer>>;
        let stubDisconnect: SinonStub<Parameters<typeof DockerEventsListener.prototype.disconnect>>;

        before(function () {
            stubRemoveStaleContainer = stub(Docker.prototype, '_removeStaleContainer').resolves();
            stubDisconnect = stub(DockerEventsListener.prototype, 'disconnect');
        });

        after(function () {
            stubRemoveStaleContainer.restore();
            stubDisconnect.restore();
        });

        it('must must process', async function () {
            const docker = new Docker('my-image');
            // @ts-expect-error Checking for error case here
            docker.process = mockProcess;

            await docker.stop();
            expect(killSpy.called).to.eql(true);
            expect(docker.process).to.eql(null);
        });
    });

    describe('#run', function () {
        const mockProcess = {
            stdout: {
                on: spy(),
            },
            stderr: {
                on: spy(),
            },
            kill: spy(),
        };

        let stubRunProcess: SinonStub<Parameters<typeof ChildProcess.runProcess>>;
        let stubRemoveStaleContainer: SinonStub<Parameters<typeof Docker.prototype._removeStaleContainer>>;
        let stubReportWhenDockerIsRunning: SinonStub<Parameters<typeof Docker.prototype._reportWhenDockerIsRunning>>;
        let stubConnect: SinonStub<Parameters<typeof DockerEventsListener.prototype.connect>>;

        beforeEach(function () {
            // @ts-expect-error Test value
            stubRunProcess = stub(ChildProcess, 'runProcess').resolves(mockProcess);
            stubRemoveStaleContainer = stub(Docker.prototype, '_removeStaleContainer').resolves();
            stubReportWhenDockerIsRunning = stub(Docker.prototype, '_reportWhenDockerIsRunning').resolves();
            stubConnect = stub(DockerEventsListener.prototype, 'connect');
        });

        afterEach(function () {
            stubRunProcess.restore();
            stubRemoveStaleContainer.restore();
            stubReportWhenDockerIsRunning.restore();
            stubConnect.restore();
        });

        context('when image is not yet pulled (first time)', function () {
            let stubIsImagePresent: SinonStub<Parameters<typeof Docker.prototype._isImagePresent>>;
            let stubPullImage: SinonStub<Parameters<typeof Docker.prototype._pullImage>>;

            before(function () {
                stubIsImagePresent = stub(Docker.prototype, '_isImagePresent').rejects();
                stubPullImage = stub(Docker.prototype, '_pullImage').resolves();
            });

            after(function () {
                stubIsImagePresent.restore();
                stubPullImage.restore();
            });

            it('must attempt to pull image', function () {
                const docker = new Docker('my-image');

                return docker.run().then(() => {
                    expect(stubPullImage.called).to.eql(true);
                });
            });
        });

        context('when image is already pulled', function () {
            let stubIsImagePresent: SinonStub<Parameters<typeof Docker.prototype._isImagePresent>>;
            let stubPullImage: SinonStub<Parameters<typeof Docker.prototype._pullImage>>;

            before(function () {
                stubIsImagePresent = stub(Docker.prototype, '_isImagePresent').rejects();
                stubPullImage = stub(Docker.prototype, '_pullImage').resolves();
            });

            after(function () {
                stubIsImagePresent.restore();
                stubPullImage.restore();
            });

            it('must just run the command', function () {
                const docker = new Docker('my-image');

                return docker.run().then(() => {
                    expect(stubPullImage.called).to.eql(false);
                    expect(stubRunProcess.called).to.eql(true);
                });
            });

            it('must emit processCreated event', function () {
                const processCreatedSpy = spy();
                const docker = new Docker('my-image');
                docker.on('processCreated', processCreatedSpy);

                return docker.run().then(() => {
                    expect(stubRunProcess.called).to.eql(true);
                    expect(processCreatedSpy.called).to.eql(true);
                });
            });
        });
    });

    describe('#stopContainer', function () {
        let stubRunCommand: SinonStub<Parameters<typeof ChildProcess.runCommand>>;

        before(function () {
            stubRunCommand = stub(ChildProcess, 'runCommand').resolves();
        });

        after(function () {
            stubRunCommand.restore();
        });

        it('must call docker command to stop running conrainer', function () {
            return Docker.stopContainer('123').then(() => {
                expect(stubRunCommand.calledWith(['docker', 'stop', '123'])).to.eql(true);
            });
        });
    });

    describe('#removeContainer', function () {
        let stubRunCommand: SinonStub<Parameters<typeof ChildProcess.runCommand>>;

        before(function () {
            stubRunCommand = stub(ChildProcess, 'runCommand').resolves();
        });

        after(function () {
            stubRunCommand.restore();
        });

        it('must call docker command to stop running conrainer', function () {
            return Docker.removeContainer('123').then(() => {
                expect(stubRunCommand.calledWith(['docker', 'rm', '123'])).to.eql(true);
            });
        });
    });

    describe('#_removeStaleContainer', function () {
        let stubRemove: SinonStub<Parameters<typeof fs.remove>>;
        let stubStopContainer: SinonStub<Parameters<typeof Docker.stopContainer>>;
        let stubRemoveContainer: SinonStub<Parameters<typeof Docker.removeContainer>>;

        beforeEach(function () {
            stubRemove = stub(fs, 'remove').resolves();
            stubStopContainer = stub(Docker, 'stopContainer').resolves();
            stubRemoveContainer = stub(Docker, 'removeContainer').resolves();
        });

        afterEach(function () {
            stubRemove.restore();
            stubStopContainer.restore();
            stubRemoveContainer.restore();
        });

        context('when cid file exists', function () {
            let stubReadFile: SinonStub<Parameters<typeof fs.readFile>>;

            before(function () {
                stubReadFile = stub(fs, 'readFile').resolves('123');
            });

            after(function () {
                stubReadFile.restore();
            });

            it('must remove stale container', function () {
                const docker = new Docker('my-image');

                return docker._removeStaleContainer().then(() => {
                    expect(stubReadFile.calledWith(docker.cidfile)).to.eql(true);
                    expect(stubRemove.calledWith(docker.cidfile)).to.eql(true);
                    expect(stubStopContainer.calledWith('123')).to.eql(true);
                    expect(stubRemoveContainer.calledWith('123')).to.eql(true);
                });
            });
        });

        context('when cid file does not exist', function () {
            let stubReadFile: SinonStub<Parameters<typeof fs.readFile>>;

            before(function () {
                stubReadFile = stub(fs, 'readFile').rejects();
            });

            after(function () {
                stubReadFile.restore();
            });

            it('must attempt to remove stale container', function () {
                const docker = new Docker('my-image');

                return docker._removeStaleContainer().catch(() => {
                    expect(stubReadFile.calledWith(docker.cidfile)).to.eql(true);
                    expect(stubRemove.calledWith(docker.cidfile)).to.eql(true);
                    expect(stubStopContainer.calledWith('123')).to.eql(false);
                    expect(stubRemoveContainer.calledWith('123')).to.eql(false);
                });
            });
        });
    });

    describe('#_pullImage', function () {
        let stubRunCommand: SinonStub<Parameters<typeof ChildProcess.runCommand>>;

        before(function () {
            stubRunCommand = stub(ChildProcess, 'runCommand').resolves();
        });

        after(function () {
            stubRunCommand.restore();
        });

        it('must call runCommand', function () {
            const docker = new Docker('my-image');
            return docker._pullImage().then(() => {
                expect(stubRunCommand.calledWith(['docker', 'pull', 'my-image'])).to.eql(true);
            });
        });
    });

    describe('#_isImagePresent', function () {
        let stubRunCommand: SinonStub<Parameters<typeof ChildProcess.runCommand>>;

        before(function () {
            stubRunCommand = stub(ChildProcess, 'runCommand').resolves();
        });

        after(function () {
            stubRunCommand.restore();
        });

        it('must call runCommand', function () {
            const docker = new Docker('my-image');
            return docker._isImagePresent().then(() => {
                expect(stubRunCommand.calledWith(['docker', 'inspect', 'my-image'])).to.eql(true);
            });
        });
    });

    describe('#_reportWhenDockerIsRunning', function () {
        context('when healthCheck is not set', async function () {
            const pingDef = (await import('@/utils/ping.js')).default;
            let stubPing: SinonStub<Parameters<typeof pingDef.prototype.Ping>>;
            let sandbox: SinonSandbox;

            before(function () {
                sandbox = createSandbox();
                stubPing = sandbox.stub(pingDef.prototype, 'Ping').rejects();
            });

            afterEach(function () {
                sandbox.restore();
            });

            it('must resolve promise right away', async function () {
                const docker = new Docker('my-image');

                await docker._reportWhenDockerIsRunning();
                expect(stubPing.called).to.eql(false);
            });
        });

        context('when healthCheck is provided', async function () {
            const pingDef = (await import('@/utils/ping.js')).default;
            const newUrl = new URL('http://localhost:8080');
            let stubPing: SinonStub<Parameters<typeof pingDef.prototype.Ping>>;
            let spyClearTimeout: SinonSpy<Parameters<typeof global.clearTimeout>>;

            before(function () {
                stubPing = stub(pingDef.prototype, 'Ping').resolves();
                spyClearTimeout = spy(global, 'clearTimeout');
            });

            after(function () {
                stubPing.restore();
                spyClearTimeout.restore();
            });

            it('must Ping the healthCheck url', function () {
                const docker = new Docker('my-image', {
                    healthCheck: newUrl.href,
                });

                return docker._reportWhenDockerIsRunning().then(() => {
                    expect(spyClearTimeout.called).to.eql(true);
                    expect(stubPing.calledWith(newUrl)).to.eql(true);
                });
            });
        });

        context('when maxRetries is specified and url is unreachable', async function () {
            const pingDef = (await import('@/utils/ping.js')).default;
            let stubPing: SinonStub<Parameters<typeof pingDef.prototype.Ping>>;
            let spyClearTimeout: SinonSpy<Parameters<typeof global.clearTimeout>>;

            before(function () {
                stubPing = stub(pingDef.prototype, 'Ping').rejects();
                spyClearTimeout = spy(global, 'clearTimeout');
            });

            after(function () {
                stubPing.restore();
                spyClearTimeout.restore();
            });

            it('must Ping same number of times as maxRetries', function () {
                const docker = new Docker('my-image', {
                    healthCheck: {
                        url: 'http://localhost:8080',
                        maxRetries: 3,
                    },
                });

                this.timeout(15000);

                return docker._reportWhenDockerIsRunning().catch(() => {
                    expect(spyClearTimeout.called).to.eql(true);
                    expect(stubPing.calledThrice).to.eql(true);
                });
            });
        });

        context('when healthCheck is provided but is unreachable', async function () {
            const pingDef = (await import('@/utils/ping.js')).default;
            const newUrl = new URL('http://localhost:8080');
            let stubPing: SinonStub<Parameters<typeof pingDef.prototype.Ping>>;
            let spyClearTimeout: SinonSpy<Parameters<typeof global.clearTimeout>>;

            before(function () {
                stubPing = stub(pingDef.prototype, 'Ping').rejects();
                spyClearTimeout = spy(global, 'clearTimeout');
            });

            after(function () {
                stubPing.restore();
                spyClearTimeout.restore();
            });

            it('must attempt to ping healthCheck url and then exit', async function () {
                const docker = new Docker('my-image', {
                    healthCheck: newUrl.href,
                });

                this.timeout(15000);

                try {
                    await docker._reportWhenDockerIsRunning();
                } catch {
                    expect(spyClearTimeout.called).to.eql(true);
                    expect(stubPing.calledWith(newUrl)).to.eql(true);
                }
            });
        });
    });
});
