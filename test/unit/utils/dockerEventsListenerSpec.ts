import { expect } from 'chai';
import { stub, spy, SinonStub, SinonSpy } from 'sinon';
import path from 'path';
import ChildProcess from 'child_process';
import logger from '@wdio/logger';
import MockDockerEvent from '@test/mocks/MockDockerEvent.json';
import MockForkedProcess from '@test/mocks/MockForkedProcess.js';
import DockerEventsListener from '@test/mocks/MockDockerEventsListener.js';

const Logger = logger('wdio-docker-service-test');

describe('DockerEventsListener', function () {
    let dockerEventsListener: DockerEventsListener;

    describe('#constructor', function () {
        context('when instantiating w/o arguments', function () {
            beforeEach(function () {
                dockerEventsListener = new DockerEventsListener();
            });

            it('must instantiate DockerEventListener', function () {
                expect(dockerEventsListener).to.be.instanceOf(DockerEventsListener);
            });

            it('must set @logger to console', function () {
                expect(dockerEventsListener.logger).to.eql(global.console);
            });

            it('must set @_subprocess to null', function () {
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });

        context('when instantiating with arguments', function () {
            beforeEach(function () {
                dockerEventsListener = new DockerEventsListener(Logger);
            });

            it('must instantiate DockerEventListener', function () {
                expect(dockerEventsListener).to.be.instanceOf(DockerEventsListener);
            });

            it('must set @logger to Logger', function () {
                expect(dockerEventsListener.logger).to.eql(Logger);
            });
        });
    });

    describe('#connect', function () {
        let mockChildProcess: SinonStub<Parameters<(typeof ChildProcess)['fork']>>;
        let spyMockForkedProcessOn: SinonSpy<Parameters<typeof MockForkedProcess.prototype.on>>;
        let spyDisconnect: SinonSpy<Parameters<typeof DockerEventsListener.prototype.disconnect>>;

        beforeEach(function () {
            mockChildProcess = stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });
            spyMockForkedProcessOn = spy(MockForkedProcess.prototype, 'on');
            dockerEventsListener = new DockerEventsListener(Logger);
            spyDisconnect = spy(dockerEventsListener, 'disconnect');
            dockerEventsListener.connect({ foo: 'bar' });
        });

        afterEach(function () {
            mockChildProcess.restore();
            spyMockForkedProcessOn.restore();
        });

        it('must call #disconnect first', function () {
            expect(spyDisconnect.called).to.be.true;
        });

        it('must fork a sub-process', function () {
            const modulePath = path.resolve(__dirname, '@/modules/dockerEvents');
            expect(mockChildProcess.calledWith(modulePath)).to.be.true;
        });

        it('must bind to message event of sub-process', function () {
            // @ts-expect-error Test type
            expect(spyMockForkedProcessOn.calledWith('message')).to.be.true;
        });

        it('must bind to error event of sub-process', function () {
            // @ts-expect-error Test type
            expect(spyMockForkedProcessOn.calledWith('error')).to.be.true;
        });

        it('must send options to sub-process', function () {
            const spySubprocess: SinonSpy<Parameters<typeof MockForkedProcess.prototype.send>> = spy(
                dockerEventsListener._subprocess!,
                'send'
            );
            expect(spySubprocess.calledWith({ foo: 'bar' })).to.be.true;
        });
    });

    describe('#disconnect', function () {
        let childProcess: SinonStub<Parameters<(typeof ChildProcess)['fork']>>;
        beforeEach(function () {
            childProcess = stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger);
            dockerEventsListener.connect();
        });

        afterEach(function () {
            childProcess.restore();
        });

        context('when sub-process exists and connected', function () {
            it('must call disconnect on sub-process', function () {
                const subProcess = spy(dockerEventsListener._subprocess!, 'disconnect');

                dockerEventsListener.disconnect();
                expect(subProcess.called).to.be.true;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });

        context('when sub-process is not connected', function () {
            it('must not call disconnect on sub-process', function () {
                const subProcess = spy(dockerEventsListener._subprocess!, 'connected');

                dockerEventsListener._subprocess!.connected = false;
                dockerEventsListener.disconnect();
                expect(subProcess.called).to.be.false;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });
    });

    describe('#_onMessage', function () {
        let stubChildProcessFork: SinonStub<Parameters<(typeof ChildProcess)['fork']>>;
        beforeEach(function () {
            stubChildProcessFork = stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger);
            dockerEventsListener.connect();
        });

        afterEach(function () {
            stubChildProcessFork.restore();
        });

        context('when message is an error', function () {
            let spyOnError: SinonSpy<Parameters<typeof DockerEventsListener.prototype._onError>>;
            let spyDisconnect: SinonSpy<Parameters<typeof DockerEventsListener.prototype.disconnect>>;

            beforeEach(function () {
                spyOnError = spy(dockerEventsListener, '_onError');
                spyDisconnect = spy(dockerEventsListener, 'disconnect');
            });

            it('must forward call to #_onError', function () {
                dockerEventsListener._subprocess?.mockMessage({
                    type: 'error',
                    message: 'Error message',
                });
                expect(spyOnError.called).to.be.true;
                expect(spyDisconnect.called).to.be.true;
            });
        });

        context('when message is a valid Docker type', function () {
            let spyEmit: SinonSpy<Parameters<typeof DockerEventsListener.prototype.emit>>;

            beforeEach(function () {
                spy(dockerEventsListener, '_onMessage');
                spyEmit = spy(dockerEventsListener, 'emit');
            });

            it('must fire an event', function () {
                dockerEventsListener._subprocess?.mockMessage(MockDockerEvent);
                expect(spyEmit.calledWith(MockDockerEvent.type, MockDockerEvent)).to.be.true;
            });
        });
    });
});
