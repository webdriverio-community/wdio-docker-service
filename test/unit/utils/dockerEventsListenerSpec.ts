import { expect } from 'chai';
import logger from '@wdio/logger';
import * as ChildProcess from 'child_process';
import { stub, spy, createSandbox, SinonStub, SinonSpy, SinonSandbox } from 'sinon';
import MockDockerEvent from '@test/mocks/MockDockerEvent.json';
import MockForkedProcess from '@test/mocks/MockForkedProcess.js';
import DockerEventsListener from '@test/mocks/MockDockerEventsListener.js';
import { DOCKER_EVENTS_MODULE } from '@root/utils/dockerEventsListener.ts';

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

    describe('#connect', async function () {
        let sandbox: SinonSandbox;
        let forkStub: SinonStub<unknown[]>;
        let spyMockForkedProcessOn: SinonSpy;
        let spyDisconnect: SinonSpy<Parameters<typeof DockerEventsListener.prototype.disconnect>>;
        let forkedInstance: MockForkedProcess;

        beforeEach(function () {
            sandbox = createSandbox();
            forkedInstance = new MockForkedProcess('someModule');
            spyMockForkedProcessOn = sandbox.spy(forkedInstance, 'on');
            forkStub = sandbox.stub().returns(forkedInstance);
            dockerEventsListener = new DockerEventsListener(Logger, forkStub);
            spyDisconnect = sandbox.spy(dockerEventsListener, 'disconnect');
            dockerEventsListener.connect({ foo: 'bar' });
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('must call #disconnect first', function () {
            expect(spyDisconnect.called).to.be.true;
        });

        it('must fork a sub-process', function () {
            expect(forkStub.calledWith(DOCKER_EVENTS_MODULE)).to.be.true;
        });

        it('must bind to message event of sub-process', function () {
            expect(spyMockForkedProcessOn.calledWith('message')).to.be.true;
        });

        it('must bind to error event of sub-process', function () {
            expect(spyMockForkedProcessOn.calledWith('error')).to.be.true;
        });

        it('must send options to sub-process', function () {
            // @ts-expect-error Test type
            expect(forkedInstance.send.calledWith({ foo: 'bar' })).to.be.true;
        });
    });

    describe('#disconnect', function () {
        let forkStub: SinonStub;
        beforeEach(function () {
            forkStub = stub().callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger, forkStub);
            dockerEventsListener.connect();
        });

        context('when sub-process exists and connected', function () {
            it('must call disconnect on sub-process', function () {
                const subProcess = dockerEventsListener._subprocess!.disconnect as unknown as SinonStub;

                dockerEventsListener.disconnect();
                expect(subProcess.called).to.be.true;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });

        context('when sub-process is not connected', function () {
            it('must not call disconnect on sub-process', function () {
                const subProcess = dockerEventsListener._subprocess!.disconnect as unknown as SinonStub;

                dockerEventsListener._subprocess!.connected = false;
                dockerEventsListener.disconnect();
                expect(subProcess.called).to.be.false;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });
    });

    describe('#_onMessage', function () {
        let forkStub: SinonStub;
        beforeEach(function () {
            forkStub = stub().callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger, forkStub);
            dockerEventsListener.connect();
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
