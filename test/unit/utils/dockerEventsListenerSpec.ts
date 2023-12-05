import { expect } from 'chai';
import { stub, spy } from 'sinon';
import path from 'path';
import ChildProcess from 'child_process';
import logger from '@wdio/logger';
import MockDockerEvent from '../../mocks/MockDockerEvent.ts';
import MockForkedProcess from '../../mocks/MockForkedProcess.ts';
import DockerEventsListener from '../../../src/utils/dockerEventsListener.ts';

const Logger = logger('wdio-docker-service-test');

describe('DockerEventsListener', function() {
    let dockerEventsListener;

    describe('#constructor', function() {
        context('when instantiating w/o arguments', function() {
            beforeEach(function() {
                dockerEventsListener = new DockerEventsListener();
            });

            it('must instantiate DockerEventListener', function() {
                expect(dockerEventsListener).to.be.instanceOf(DockerEventsListener);
            });

            it('must set @logger to console', function() {
                expect(dockerEventsListener.logger).to.eql(global.console);
            });

            it('must set @_subprocess to null', function() {
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });

        context('when instantiating with arguments', function() {
            beforeEach(function() {
                dockerEventsListener = new DockerEventsListener(Logger);
            });

            it('must instantiate DockerEventListener', function() {
                expect(dockerEventsListener).to.be.instanceOf(DockerEventsListener);
            });

            it('must set @logger to Logger', function() {
                expect(dockerEventsListener.logger).to.eql(Logger);
            });
        });
    });

    describe('#connect', function() {
        beforeEach(function() {
            stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });

            spy(MockForkedProcess.prototype, 'on');

            dockerEventsListener = new DockerEventsListener(Logger);

            spy(dockerEventsListener, 'disconnect');

            dockerEventsListener.connect({ foo: 'bar' });
        });

        afterEach(function() {
            ChildProcess.fork.restore();
            MockForkedProcess.prototype.on.restore();
        });

        it('must call #disconnect first', function() {
            expect(dockerEventsListener.disconnect.called).to.be.true;
        });

        it('must fork a sub-process', function() {
            const modulePath = path.resolve(__dirname, '../../../src/modules/dockerEvents');
            expect(ChildProcess.fork.calledWith(modulePath)).to.be.true;
        });

        it('must bind to message event of sub-process', function() {
            expect(MockForkedProcess.prototype.on.calledWith('message')).to.be.true;
        });

        it('must bind to error event of sub-process', function() {
            expect(MockForkedProcess.prototype.on.calledWith('error')).to.be.true;
        });

        it('must send options to sub-process', function() {
            expect(dockerEventsListener._subprocess.send.calledWith({ foo: 'bar' })).to.be.true;
        });
    });

    describe('#disconnect', function() {
        beforeEach(function() {
            stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger);
            dockerEventsListener.connect();
        });

        afterEach(function() {
            ChildProcess.fork.restore();
        });

        context('when sub-process exists and connected', function() {
            it('must call disconnect on sub-process', function() {
                const subProcess = dockerEventsListener._subprocess;

                dockerEventsListener.disconnect();
                expect(subProcess.disconnect.called).to.be.true;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });

        context('when sub-process is not connected', function() {
            it('must not call disconnect on sub-process', function() {
                const subProcess = dockerEventsListener._subprocess;

                dockerEventsListener._subprocess.connected = false;
                dockerEventsListener.disconnect();
                expect(subProcess.disconnect.called).to.be.false;
                expect(dockerEventsListener._subprocess).to.be.null;
            });
        });
    });

    describe('#_onMessage', function() {
        beforeEach(function() {
            stub(ChildProcess, 'fork').callsFake((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger);
            dockerEventsListener.connect();
        });

        afterEach(function() {
            ChildProcess.fork.restore();
        });

        context('when message is an error', function() {
            beforeEach(function() {
                spy(dockerEventsListener, '_onError');
                spy(dockerEventsListener, 'disconnect');
            });

            it('must forward call to #_onError', function() {
                dockerEventsListener._subprocess.mockMessage({ type: 'error', message: 'Error message' });
                expect(dockerEventsListener._onError.called).to.be.true;
                expect(dockerEventsListener.disconnect.called).to.be.true;
            });
        });

        context('when message is a valid Docker type', function() {
            beforeEach(function() {
                spy(dockerEventsListener, '_onMessage');
                spy(dockerEventsListener, 'emit');
            });

            it('must fire an event', function() {
                dockerEventsListener._subprocess.mockMessage(MockDockerEvent);
                expect(dockerEventsListener.emit.calledWith(MockDockerEvent.type, MockDockerEvent)).to.be.true;
            });
        });
    });
});
