import { expect } from 'chai';
import MockChildProcess from '@test/mocks/MockChildProcess.js';
import { runProcess, runCommand } from '@root/utils/childProcess.js';
import type { ChildProcess, spawn, SpawnOptions } from 'child_process';

type SpawnFunction = ((
    command: string,
    args: string[],
    options?: SpawnOptions
) => ChildProcess) | typeof spawn;

describe('Child Process utils', function () {
    describe('#runProcess', function () {
        context('when command fails to execute', function () {
            it('must reject with error', async function () {
                const mockSpawn = (cmd: string, args: Parameters<typeof spawn>['1']) => {
                    const mp = new MockChildProcess(cmd, args);
                    
                    process.nextTick(() => {
                        mp.mockError();
                    });
                    
                    return mp;
                };

                let loggedError: Error | undefined;
                await runProcess(['foo', 'bar'], mockSpawn)
                    .catch((err: Error) => loggedError = err);

                expect(loggedError).to.be.instanceOf(Error);
            });
        });

        context('when command is successful', function () {
            it('must resolve promise with child process', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: Parameters<typeof spawn>['1']) => {
                    const mp = new MockChildProcess(cmd, args);
                    
                    process.nextTick(() => {
                        mp.mockClose(0);
                    });
                    
                    return mp;
                };

                let processError: Error | undefined;
                const childProcess = await runProcess(['foo', 'bar'], mockSpawn).catch(
                    (err: Error) => {
                        console.log('runProcess rejected with:', err);
                        processError = err;
                        return undefined;
                    }
                );
                
                expect(processError).to.be.undefined;
                expect(childProcess).to.be.instanceOf(MockChildProcess);
            });
        });

        context('when command exits with non-zero code', function () {
            it('must reject with error', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: Parameters<typeof spawn>['1']) => {
                    const mp = new MockChildProcess(cmd, args);
                    
                    process.nextTick(() => {
                        mp.mockClose(1);
                    });
                    
                    return mp;
                };

                let processError: Error | undefined;
                await runProcess(['foo', 'bar'], mockSpawn)
                    .catch((err: Error) => processError = err);

                expect(processError).to.be.instanceOf(Error);
                expect(processError?.message).to.include('Process exited with code 1');
            });
        });
    });

    describe('#runCommand', function () {
        context('when command is successful', function () {
            it('must resolve with stdout, stderr, and exit code', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: Parameters<typeof spawn>['1']) => {
                    const mp = new MockChildProcess(cmd, args);
                    
                    process.nextTick(() => {
                        mp.stdout.emit('data', 'Hello World\n');
                        mp.mockClose(0);
                    });
                    
                    return mp;
                };

                const result = await runCommand(['echo', 'Hello World'], mockSpawn);
                
                expect(result).to.have.property('stdout');
                expect(result).to.have.property('stderr');
                expect(result).to.have.property('code');
                expect(result.code).to.equal(0);
            });
        });
    });
});
