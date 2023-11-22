import ChildProcess from 'child_process';
import MockChildProcess from '../../mocks/MockChildProcess';
import { expect } from 'chai';
import { runProcess, runCommand } from '../../../src/utils/childProcess';
import { stub } from 'sinon';

describe('Child Process utils', function () {
    describe('#runProcess', function () {
        context('when command fails to execute', function () {
            before(function () {
                stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockError();
                    });

                    return mp;
                });
            });

            after(function () {
                ChildProcess.spawn.restore();
            });

            it('must reject with error', function () {
                return runProcess(['foo', 'bar'])
                    .catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                    });
            });
        });

        context('when command is successful', function () {
            before(function () {
                stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);
                    return mp;
                });
            });

            after(function () {
                ChildProcess.spawn.restore();
            });

            it('must resolve promise with child process', function () {
                return runProcess(['foo', 'bar'])
                    .then((childProcess) => {
                        expect(childProcess).to.be.instanceOf(MockChildProcess);
                    });
            });
        });
    });

    describe('#runCommand', function () {
        context('when command fails to execute', function () {
            before(function () {
                stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockError();
                    });

                    return mp;
                });
            });

            after(function () {
                ChildProcess.spawn.restore();
            });

            it('must reject with error', function () {
                return runCommand('foo', ['bar'])
                    .catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                    });
            });
        });

        context('when command returns non 0 return code', function () {
            before(function () {
                stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockClose(123);
                    });

                    return mp;
                });
            });

            after(function () {
                ChildProcess.spawn.restore();
            });

            it('must reject with error', function () {
                return runCommand(['foo', 'bar'])
                    .catch((err) => {
                        expect(err).to.be.instanceOf(Error);
                        expect(err.message).to.eql('Command \'foo bar\' exited with code 123');
                    });
            });
        });

        context('when command runs successfully', function () {
            before(function () {
                stub(ChildProcess, 'spawn').callsFake((cmd, args) => {
                    const mp = new MockChildProcess(cmd, args);

                    process.nextTick(() => {
                        mp.mockClose(0);
                    });

                    return mp;
                });
            });

            after(function () {
                ChildProcess.spawn.restore();
            });

            it('must resolve promise with child process', function () {
                return runCommand('foo', ['bar'])
                    .then((childProcess) => {
                        expect(childProcess).to.be.instanceOf(MockChildProcess);
                    });
            });
        });
    });
});
