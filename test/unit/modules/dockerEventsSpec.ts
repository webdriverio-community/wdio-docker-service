import { expect } from 'chai';
import { stub, spy, SinonStub, SinonSpy } from 'sinon';
import ChildProcess from 'child_process';
import DockerEvents from '@/modules/dockerEvents.js';
import MockChildProcess from '@test/mocks/MockChildProcess.js';
import MockRawDockerEvent from '@test/mocks/MockRawDockerEvent.json';

describe('DockerEvents module', function () {
    let stubbedExec: SinonStub<Parameters<typeof ChildProcess['exec']>>;

    beforeEach(function () {
        stub(ChildProcess, 'exec').callsFake(cmd => {
            return new MockChildProcess(cmd);
        });
        
        Reflect.defineProperty(global.process, 'send', { value: spy() });
        Reflect.defineProperty(global.process, 'connected', { value: true });
    });

    afterEach(function () {
        stubbedExec.restore();
        Reflect.deleteProperty(global.process, 'send');
        Reflect.deleteProperty(global.process, 'connected');
    });

    describe('#init', function () {
        const cmd = 'docker events --format "{{json .}}"';

        context('when calling w/o options', function () {
            beforeEach(function () {
                DockerEvents.init();
            });

            it('must start sub-process with default command', function () {
                expect(stubbedExec.calledWith(cmd)).to.be.true;
            });
        });

        context('when calling with options', function () {
            it('must start sub-process with optional flags', function () {
                DockerEvents.init({ foo: 'bar' });
                expect(stubbedExec.calledWith(`${ cmd } --foo bar`)).to.be.true;
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

        beforeEach(function () {
            killSpy = spy((DockerEvents.process!).kill);
        });

        it('must kill sub-process', function () {
            DockerEvents._onDisconnect();
            expect(killSpy.called).to.be.true;
            expect(DockerEvents.process).to.be.null;
        });
    });

    describe('#_onExit', function () {
        let sendMock: SinonSpy;
        context('when called with Error code', function () {
            it('must send error to parent process', function () {
                sendMock = spy(global.process, 'send');
                sendMock.resetHistory();
                DockerEvents._onExit(125, 'foo', '');
                expect(sendMock.calledWith({
                    type: 'error',
                    message: 'Error executing sub-child: foo'
                })).to.be.true;
            });
        });

        context('when process exits with code 0', function () {
            it('must do nothing', function () {
                sendMock = spy(global.process, 'send');
                sendMock.resetHistory();
                DockerEvents._onExit(0, '', '');
                expect(sendMock.called).to.be.false;
            });
        });
    });

    describe('#_parseEventData', function () {
        it('must extract data from JSON and send data to parent', function () {
            const sendMock: SinonSpy = spy(global.process, 'send');
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
            })).to.be.true;
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
