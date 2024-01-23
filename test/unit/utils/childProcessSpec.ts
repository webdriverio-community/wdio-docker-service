import { SinonStub, stub } from 'sinon';
import { expect } from 'chai';
import ChildProcess from 'child_process';
import MockChildProcess from '@test/mocks/MockChildProcess.js';
import { runProcess, runCommand } from '@/utils/childProcess.js';

describe('Child Process utils', function () {
    describe('#runProcess', function () {
        context('when command fails to execute', function () {
            let stubSpawn: SinonStub<Parameters<typeof ChildProcess['spawn']>>;
            before(function () {
                stubSpawn = stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockError();
                    });

                    return mp;
                });
            });

            after(function () {
                stubSpawn.restore();
            });

            it('must reject with error', function () {
                return runProcess(['foo', 'bar'])
                    .catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                    });
            });
        });

        context('when command is successful', function () {
            let stubSpawn: SinonStub<Parameters<typeof ChildProcess['spawn']>>;
            before(function () {
                stubSpawn = stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);
                    return mp;
                });
            });

            after(function () {
                stubSpawn.restore();
            });

            it('must resolve promise with child process', async function () {
                const childProcess = await runProcess(['foo', 'bar']);
                expect(childProcess).to.be.instanceOf(MockChildProcess);
            });
        });
    });

    describe('#runCommand', function () {
        context('when command fails to execute', function () {
            let stubSpawn: SinonStub<Parameters<typeof ChildProcess['spawn']>>;
            before(function () {
                stubSpawn = stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockError();
                    });

                    return mp;
                });
            });

            after(function () {
                stubSpawn.restore();
            });

            it('must reject with error', async function () {
                try {
                    // @ts-expect-error Testing invalid arguments
                    return await runCommand('foo', ['bar']);
                } catch (err) {
                    expect(err).to.be.instanceOf(Error);
                }
            });
        });

        context('when command returns non 0 return code', function () {
            let stubSpawn: SinonStub<Parameters<typeof ChildProcess['spawn']>>;

            before(function () {
                stubSpawn = stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockClose(123);
                    });

                    return mp;
                });
            });

            after(function () {
                stubSpawn.restore();
            });

            it('must reject with error', async function () {
                try {
                    return await runCommand(['foo', 'bar']);
                } catch (err) {
                    expect(err).to.be.instanceOf(Error);
                    expect((err as Error).message).to.eql('Command \'foo bar\' exited with code 123');
                }
            });
        });

        context('when command runs successfully', function () {
            let stubSpawn: SinonStub<Parameters<typeof ChildProcess['spawn']>>;

            before(function () {
                stubSpawn = stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockClose(0);
                    });

                    return mp;
                });
            });

            after(function () {
                stubSpawn.restore();
            });

            it('must resolve promise with child process', async function () {
                // @ts-expect-error Need to check these args
                const childProcess = await runCommand('foo', ['bar']);
                expect(childProcess).to.be.instanceOf(MockChildProcess);
            });
        });
    });
});
