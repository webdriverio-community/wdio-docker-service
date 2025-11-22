import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, MockInstance } from 'vitest';
import MockChildProcess from '@test/mocks/MockChildProcess.js';
import MockRawDockerEvent from '@test/mocks/MockRawDockerEvent.json';
import type { ProcessLike } from '@root/modules/dockerEvents.js';

const mocks = vi.hoisted(() => ({
    exec: vi.fn().mockReturnValue({
        stdout: { setEncoding: vi.fn(), on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
    }),
}));

// Mock child_process
vi.mock('child_process', () => ({
    exec: mocks.exec,
    ChildProcess: vi.fn(),
    default: { exec: mocks.exec }
}));

describe('DockerEvents module', function () {
    let DockerEvents: typeof import('@root/modules/dockerEvents.js').default;
    let stubbedExec: MockInstance;

    beforeAll(async () => {
        // Prevent DockerEvents from attaching a message listener to the global process
        const spy = vi.spyOn(process, 'on').mockImplementation((event, listener) => {
            if (event === 'message') {
                return process;
            }
            return process;
        });

        // Import the module dynamically
        DockerEvents = (await import('@root/modules/dockerEvents.js')).default;

        // Restore process.on
        spy.mockRestore();
    });

    beforeEach(function () {
        stubbedExec = mocks.exec.mockImplementation((cmd) => {
            console.log('Mock exec called with:', cmd);
            return new MockChildProcess(cmd);
        });
    });

    afterEach(function () {
        vi.restoreAllMocks();
    });

    describe('#init', function () {
        const cmd = 'docker events --format "{{json .}}"';

        describe('when calling w/o options', function () {
            it('must start sub-process with default command', function () {
                DockerEvents.init().then(() => {
                    expect(stubbedExec).toHaveBeenCalledWith(cmd);
                });
            });
        });

        describe('when calling with options', function () {
            it('must start sub-process with optional flags', function () {
                DockerEvents.init({ foo: 'bar' }).then(() => {
                    expect(stubbedExec).toHaveBeenCalledWith(`${ cmd } --foo bar`);
                });
            });
        });

        describe('when data is received from stdout', function () {
            let tryParseSpy: MockInstance;
            let parseEventDataSpy: MockInstance;
            beforeEach(function () {
                DockerEvents.init();
                tryParseSpy = vi.spyOn(DockerEvents, '_tryParse');
                parseEventDataSpy = vi.spyOn(DockerEvents, '_parseEventData');
            });

            afterEach(function () {
                tryParseSpy.mockRestore();
                parseEventDataSpy.mockRestore();
            });

            it('must try to parse it', function () {
                DockerEvents.process?.stdout?.emit('data', JSON.stringify(MockRawDockerEvent));
                expect(tryParseSpy).toHaveBeenCalled();
                expect(parseEventDataSpy).toHaveBeenCalled();
            });
        });

        describe('when process exits', function () {
            let onExitStub: MockInstance;

            beforeEach(function () {
                onExitStub = vi.spyOn(DockerEvents, '_onExit');
            });

            afterEach(function () {
                onExitStub.mockRestore();
            });

            it('must call #_onExit', function () {
                DockerEvents.process?.emit('exit', 125);
                expect(onExitStub).toHaveBeenCalled();
            });
        });

        describe('when process disconnects', function () {
            let onDisconnectStub: MockInstance;
            
            beforeEach(function () {
                onDisconnectStub = vi.spyOn(DockerEvents, '_onDisconnect');
            });

            afterEach(function () {
                onDisconnectStub.mockRestore();
            });

            it('must call #_onDisconnect', function () {
                process.emit('disconnect');
                expect(onDisconnectStub).toHaveBeenCalled();
            });
        });
    });

    describe('#_onDisconnect', function () {
        let killSpy: MockInstance;

        beforeEach(function () {
            killSpy = vi.fn();
            DockerEvents.process = {
                kill: killSpy
            } as unknown as typeof DockerEvents['process'];
        });

        it('must kill sub-process', function () {
            DockerEvents._onDisconnect();
            expect(killSpy).toHaveBeenCalled();
            expect(DockerEvents.process).toBeNull();
        });
    });

    describe('#_onExit', function () {
        let sendMock: MockInstance;
        let originalParentProcess: ProcessLike;

        beforeEach(() => {
            originalParentProcess = DockerEvents.parentProcess;
            sendMock = vi.fn();
            DockerEvents.parentProcess = {
                connected: true,
                send: sendMock as unknown as ProcessLike['send'],
                on: vi.fn()
            };
        });

        afterEach(() => {
            DockerEvents.parentProcess = originalParentProcess;
        });

        describe('when called with Error code', function () {
            it('must send error to parent process', function () {
                DockerEvents._onExit(125, 'foo', '');
                expect(sendMock).toHaveBeenCalledWith({
                    type: 'error',
                    message: 'Error executing sub-child: foo'
                });
            });
        });

        describe('when process exits with code 0', function () {
            it('must do nothing', function () {
                DockerEvents._onExit(0, '', '');
                expect(sendMock).not.toHaveBeenCalled();
            });
        });
    });

    describe('#_parseEventData', function () {
        let sendMock: MockInstance;
        let originalParentProcess: ProcessLike;

        beforeEach(() => {
            originalParentProcess = DockerEvents.parentProcess;
            sendMock = vi.fn();
            DockerEvents.parentProcess = {
                connected: true,
                send: sendMock as unknown as ProcessLike['send'],
                on: vi.fn()
            };
        });

        afterEach(() => {
            DockerEvents.parentProcess = originalParentProcess;
        });

        it('must extract data from JSON and send data to parent', function () {
            DockerEvents._parseEventData(MockRawDockerEvent);
            expect(sendMock).toHaveBeenCalledWith({
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
            });
        });
    });

    describe('#_tryParse', function () {
        describe('when data is NOT JSON', function () {
            it('must return null', function () {
                const testValue = DockerEvents._tryParse('foo');
                expect(testValue).toBeNull();
            });
        });

        describe('when data is JSON', function () {
            it('must return JSON', function () {
                const testValue = DockerEvents._tryParse(JSON.stringify(MockRawDockerEvent));
                expect(testValue).toEqual(MockRawDockerEvent);
            });
        });
    });
});
