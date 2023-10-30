import { expect } from 'chai';
import { stub, spy } from 'sinon';
import * as ChildProcess from 'child_process';
import MockChildProcess from '../../mocks/MockChildProcess';
import MockRawDockerEvent from '../../mocks/MockRawDockerEvent.json';
import DockerEvents from '../../../src/modules/dockerEvents';

describe('DockerEvents module', function () {

    beforeEach(function () {
        stub(ChildProcess, 'exec').callsFake((cmd) => {
            return new MockChildProcess(cmd);
        });
        Reflect.defineProperty(global.process, 'send', { value: spy() });
        Reflect.defineProperty(global.process, 'connected', { value: true });
    });

    afterEach(function () {
        ChildProcess.exec.restore();
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
                expect(ChildProcess.exec.calledWith(cmd)).to.be.true;
            });
        });

        context('when calling with options', function () {
            it('must start sub-process with optional flags', function () {
                DockerEvents.init({ foo: 'bar' });
                expect(ChildProcess.exec.calledWith(`${ cmd } --foo bar`)).to.be.true;
            });
        });

        context('when data is received from stdout', function () {
            beforeEach(function () {
                spy(DockerEvents, '_tryParse');
                spy(DockerEvents, '_parseEventData');
            });

            afterEach(function () {
                DockerEvents._tryParse.restore();
                DockerEvents._parseEventData.restore();
            });

            it('must try to parse it', function () {
                DockerEvents.process.stdout.emit('data', JSON.stringify(MockRawDockerEvent));
                expect(DockerEvents._tryParse.called).to.be.true;
                expect(DockerEvents._parseEventData.called).to.be.true;
            });
        });

        context('when process exits', function () {
            beforeEach(function () {
                stub(DockerEvents, '_onExit');
            });

            afterEach(function () {
                DockerEvents._onExit.restore();
            });

            it('must call #_onExit', function () {
                DockerEvents.process.emit('exit', 125);
                expect(DockerEvents._onExit.called).to.be.true;
            });
        });

        context('when process disconnects', function () {
            beforeEach(function () {
                stub(DockerEvents, '_onDisconnect');
            });

            afterEach(function () {
                DockerEvents._onDisconnect.restore();
            });

            it('must call #_onDisconnect', function () {
                process.emit('disconnect');
                expect(DockerEvents._onDisconnect.called).to.be.true;
            });
        });
    });

    describe('#_onDisconnect', function () {
        let killSpy;

        beforeEach(function () {
            killSpy = DockerEvents.process.kill;
        });

        it('must kill sub-process', function () {
            DockerEvents._onDisconnect();
            expect(killSpy.called).to.be.true;
            expect(DockerEvents.process).to.be.null;
        });
    });

    describe('#_onExit', function () {
        context('when called with Error code', function () {
            it('must send error to parent process', function () {
                process.send.resetHistory();
                DockerEvents._onExit(125, 'foo');
                expect(process.send.calledWith({
                    type: 'error',
                    message: 'Error executing sub-child: foo'
                })).to.be.true;
            });
        });

        context('when process exits with code 0', function () {
            it('must do nothing', function () {
                process.send.resetHistory();
                DockerEvents._onExit(0);
                expect(process.send.called).to.be.false;
            });
        });
    });

    describe('#_parseEventData', function () {
        it('must extract data from JSON and send data to parent', function () {
            DockerEvents._parseEventData(MockRawDockerEvent);
            expect(global.process.send.calledWith({
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
