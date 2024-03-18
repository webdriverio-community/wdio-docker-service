import { expect } from 'chai';
import { stub, spy, createSandbox, SinonStub, SinonSpy, SinonSandbox } from 'sinon';
import ChildProcess from 'child_process';
import DockerEvents from '@/modules/dockerEvents.js';
import MockChildProcess from '@test/mocks/MockChildProcess.js';
import MockRawDockerEvent from '@test/mocks/MockRawDockerEvent.json';

describe('DockerEvents module', function () {
    let sandbox: SinonSandbox;
    let stubbedExec: SinonStub<Parameters<typeof ChildProcess['exec']>>;

    beforeEach(function () {
        sandbox = createSandbox();
        stubbedExec = sandbox.stub(ChildProcess, 'exec').callsFake(cmd => {
            return new MockChildProcess(cmd);
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('#init', function () {
        const cmd = 'docker events --format "{{json .}}"';

        context('when calling w/o options', function () {
            it('must start sub-process with default command', function () {
                DockerEvents.init().then(() => {
                    expect(stubbedExec.calledWith(cmd)).equal(true);
                });
            });
        });

        context('when calling with options', function () {
            it('must start sub-process with optional flags', function () {
                DockerEvents.init({ foo: 'bar' }).then(() => {
                    expect(stubbedExec.calledWith(`${ cmd } --foo bar`)).to.be.true;
                });
            });
        });

        context('when data is received from stdout', function () {
            let tryParseSpy: SinonSpy<Parameters<typeof DockerEvents['_tryParse']>>;
            let parseEventDataSpy: SinonSpy<Parameters<typeof DockerEvents['_parseEventData']>>;
            beforeEach(function () {
                tryParseSpy = spy(DockerEvents, '_tryParse');
                parseEventDataSpy = spy(DockerEvents, '_parseEventData');
            });

            afterEach(function () {
                tryParseSpy.restore();
                parseEventDataSpy.restore();
            });

            it('must try to parse it', function () {
                DockerEvents.process?.stdout?.emit('data', JSON.stringify(MockRawDockerEvent));
                expect(tryParseSpy.called).to.be.true;
                expect(parseEventDataSpy.called).to.be.true;
            });
        });

        context('when process exits', function () {
            let onExitStub: SinonStub<Parameters<typeof DockerEvents['_onExit']>>;

            beforeEach(function () {
                onExitStub = stub(DockerEvents, '_onExit');
            });

            afterEach(function () {
                onExitStub.restore();
            });

            it('must call #_onExit', function () {
                DockerEvents.process?.emit('exit', 125);
                expect(onExitStub.called).to.be.true;
            });
        });

        context('when process disconnects', function () {
            let onDisconnectStub: SinonStub<Parameters<typeof DockerEvents['_onDisconnect']>>;
            
            beforeEach(function () {
                onDisconnectStub = stub(DockerEvents, '_onDisconnect');
            });

            afterEach(function () {
                onDisconnectStub.restore();
            });

            it('must call #_onDisconnect', function () {
                process.emit('disconnect');
                expect(onDisconnectStub.called).to.be.true;
            });
        });
    });

    describe('#_onDisconnect', function () {
        let killSpy: SinonSpy<Parameters<NonNullable<typeof DockerEvents['process']>['kill']>>;
        let sandbox: SinonSandbox;

        beforeEach(function () {
            sandbox = createSandbox();
            killSpy = sandbox.stub();
            DockerEvents.process = {
                kill: killSpy
            } as unknown as typeof DockerEvents['process'];
        });

        it('must kill sub-process', function () {
            DockerEvents._onDisconnect();
            expect(killSpy.called).to.be.true;
            expect(DockerEvents.process).to.be.null;
        });
    });

    describe('#_onExit', function () {
        let sendMock: SinonSpy;
        let sandbox: SinonSandbox;

        beforeEach(() => {
            sandbox = createSandbox();
            sendMock = sandbox.stub();
            global.process = {
                ...global.process,
                send: sendMock,
                connected: true,
            } as unknown as typeof global.process;
        });

        afterEach(() => {
            global.process.send = undefined;
            sandbox.restore();
        });

        context('when called with Error code', function () {
            it('must send error to parent process', function () {
                DockerEvents._onExit(125, 'foo', '');
                expect(sendMock.calledWith({
                    type: 'error',
                    message: 'Error executing sub-child: foo'
                })).equal(true);
            });
        });

        context('when process exits with code 0', function () {
            it('must do nothing', function () {
                DockerEvents._onExit(0, '', '');
                expect(sendMock.called).equal(false);
            });
        });
    });

    describe('#_parseEventData', function () {
        let sendMock: SinonSpy;
        let sandbox: SinonSandbox;

        beforeEach(() => {
            sandbox = createSandbox();
            sendMock = sandbox.stub();
            global.process = {
                ...global.process,
                send: sendMock,
                connected: true,
            } as unknown as typeof global.process;
        });

        afterEach(() => {
            global.process.send = undefined;
            sandbox.restore();
        });

        it('must extract data from JSON and send data to parent', function () {
            DockerEvents._parseEventData(MockRawDockerEvent);
            expect(sendMock.calledWith({
                args: '',
                image: MockRawDockerEvent.from,
                timeStamp: new Date(MockRawDockerEvent.timeNano / 1000000),
                type: `${ MockRawDockerEvent.Type }.${ MockRawDockerEvent.Action }`,
                status: MockRawDockerEvent.status,
                detail: {
                    id: MockRawDockerEvent.id,
                    scope: MockRawDockerEvent.scope,
                    actor: MockRawDockerEvent.Actor
                }
            })).equal(true);
        });
    });

    describe('#_tryParse', function () {
        context('when data is NOT JSON', function () {
            it('must return null', function () {
                const testValue = DockerEvents._tryParse('foo');
                expect(testValue).to.be.null;
            });
        });

        context('when data is JSON', function () {
            it('must return JSON', function () {
                const testValue = DockerEvents._tryParse(JSON.stringify(MockRawDockerEvent));
                expect(testValue).to.eql(MockRawDockerEvent);
            });
        });
    });
});
