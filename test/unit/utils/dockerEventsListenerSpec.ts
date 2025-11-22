import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import logger from '@wdio/logger';
import MockDockerEvent from '@test/mocks/MockDockerEvent.json';
import MockForkedProcess from '@test/mocks/MockForkedProcess.js';
import DockerEventsListener from '@test/mocks/MockDockerEventsListener.js';
import { DOCKER_EVENTS_MODULE } from '@root/utils/dockerEventsListener.ts';

const Logger = logger('wdio-docker-service-test');

describe('DockerEventsListener', function () {
    let dockerEventsListener: DockerEventsListener;

    describe('#constructor', function () {
        describe('when instantiating w/o arguments', function () {
            beforeEach(function () {
                dockerEventsListener = new DockerEventsListener();
            });

            it('must instantiate DockerEventListener', function () {
                expect(dockerEventsListener).toBeInstanceOf(DockerEventsListener);
            });

            it('must set @logger to console', function () {
                expect(dockerEventsListener.logger).toEqual(global.console);
            });

            it('must set @_subprocess to null', function () {
                expect(dockerEventsListener._subprocess).toBeNull();
            });
        });

        describe('when instantiating with arguments', function () {
            beforeEach(function () {
                dockerEventsListener = new DockerEventsListener(Logger);
            });

            it('must instantiate DockerEventListener', function () {
                expect(dockerEventsListener).toBeInstanceOf(DockerEventsListener);
            });

            it('must set @logger to Logger', function () {
                expect(dockerEventsListener.logger).toEqual(Logger);
            });
        });
    });

    describe('#connect', async function () {
        let forkStub: MockInstance;
        let spyMockForkedProcessOn: MockInstance;
        let spyDisconnect: MockInstance;
        let forkedInstance: MockForkedProcess;

        beforeEach(function () {
            forkedInstance = new MockForkedProcess('someModule');
            spyMockForkedProcessOn = vi.spyOn(forkedInstance, 'on');
            forkStub = vi.fn().mockReturnValue(forkedInstance);
            dockerEventsListener = new DockerEventsListener(Logger, forkStub as any);
            spyDisconnect = vi.spyOn(dockerEventsListener, 'disconnect');
            dockerEventsListener.connect({ foo: 'bar' });
        });

        afterEach(function () {
            vi.restoreAllMocks();
        });

        it('must call #disconnect first', function () {
            expect(spyDisconnect).toHaveBeenCalled();
        });

        it('must fork a sub-process', function () {
            expect(forkStub).toHaveBeenCalledWith(DOCKER_EVENTS_MODULE);
        });

        it('must bind to message event of sub-process', function () {
            expect(spyMockForkedProcessOn).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('must bind to error event of sub-process', function () {
            expect(spyMockForkedProcessOn).toHaveBeenCalledWith('error', expect.any(Function));
        });

        it('must send options to sub-process', function () {
            expect(forkedInstance.send).toHaveBeenCalledWith({ foo: 'bar' });
        });
    });

    describe('#disconnect', function () {
        let forkStub: MockInstance;
        beforeEach(function () {
            forkStub = vi.fn().mockImplementation((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger, forkStub as any);
            dockerEventsListener.connect();
        });

        describe('when sub-process exists and connected', function () {
            it('must call disconnect on sub-process', function () {
                const subProcess = dockerEventsListener._subprocess!.disconnect as unknown as MockInstance;

                dockerEventsListener.disconnect();
                expect(subProcess).toHaveBeenCalled();
                expect(dockerEventsListener._subprocess).toBeNull();
            });
        });

        describe('when sub-process is not connected', function () {
            it('must not call disconnect on sub-process', function () {
                const subProcess = dockerEventsListener._subprocess!.disconnect as unknown as MockInstance;

                dockerEventsListener._subprocess!.connected = false;
                dockerEventsListener.disconnect();
                expect(subProcess).not.toHaveBeenCalled();
                expect(dockerEventsListener._subprocess).toBeNull();
            });
        });
    });

    describe('#_onMessage', function () {
        let forkStub: MockInstance;
        beforeEach(function () {
            forkStub = vi.fn().mockImplementation((module) => {
                return new MockForkedProcess(module);
            });

            dockerEventsListener = new DockerEventsListener(Logger, forkStub as any);
            dockerEventsListener.connect();
        });

        describe('when message is an error', function () {
            let spyOnError: MockInstance;
            let spyDisconnect: MockInstance;

            beforeEach(function () {
                spyOnError = vi.spyOn(dockerEventsListener, '_onError');
                spyDisconnect = vi.spyOn(dockerEventsListener, 'disconnect');
            });

            it('must forward call to #_onError', function () {
                dockerEventsListener._subprocess?.mockMessage({
                    type: 'error',
                    message: 'Error message',
                });
                expect(spyOnError).toHaveBeenCalled();
                expect(spyDisconnect).toHaveBeenCalled();
            });
        });

        describe('when message is a valid Docker type', function () {
            let spyEmit: MockInstance;

            beforeEach(function () {
                vi.spyOn(dockerEventsListener, '_onMessage');
                spyEmit = vi.spyOn(dockerEventsListener, 'emit');
            });

            it('must fire an event', function () {
                dockerEventsListener._subprocess?.mockMessage(MockDockerEvent);
                expect(spyEmit).toHaveBeenCalledWith(MockDockerEvent.type, MockDockerEvent);
            });
        });
    });
});
