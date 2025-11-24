import { describe, it, expect } from 'vitest'
import MockChildProcess from '@test/mocks/MockChildProcess.js'
import { runProcess, runCommand } from '@root/utils/childProcess.js'
import type { ChildProcess, spawn, SpawnOptions } from 'node:child_process'

type SpawnFunction = ((
    command: string,
    args: string[],
    options?: SpawnOptions
) => ChildProcess) | typeof spawn

describe('Child Process utils', function () {
    describe('#runProcess', function () {
        describe('when command fails to execute', function () {
            it('must reject with error', async function () {
                const mockSpawn = (cmd: string, args: string[]) => {
                    const mp = new MockChildProcess(cmd, args)

                    process.nextTick(() => {
                        mp.mockError()
                    })

                    return mp as unknown as ChildProcess
                }

                let loggedError: Error | undefined
                await runProcess(['foo', 'bar'], mockSpawn)
                    .catch((err: Error) => loggedError = err)

                expect(loggedError).toBeInstanceOf(Error)
            })
        })

        describe('when command is successful', function () {
            it('must resolve promise with child process', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: string[]) => {
                    const mp = new MockChildProcess(cmd, args)

                    process.nextTick(() => {
                        mp.mockClose(0)
                    })

                    return mp as unknown as ChildProcess
                }

                let processError: Error | undefined
                const childProcess = await runProcess(['foo', 'bar'], mockSpawn).catch(
                    (err: Error) => {
                        console.log('runProcess rejected with:', err)
                        processError = err
                        return undefined
                    }
                )

                expect(processError).toBeUndefined()
                expect(childProcess).toBeInstanceOf(MockChildProcess)
            })
        })

        describe('when command exits with non-zero code', function () {
            it('must reject with error', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: string[]) => {
                    const mp = new MockChildProcess(cmd, args)

                    process.nextTick(() => {
                        mp.mockClose(1)
                    })

                    return mp as unknown as ChildProcess
                }

                let processError: Error | undefined
                await runProcess(['foo', 'bar'], mockSpawn)
                    .catch((err: Error) => processError = err)

                expect(processError).toBeInstanceOf(Error)
                expect(processError?.message).toContain('Process exited with code 1')
            })
        })
    })

    describe('#runCommand', function () {
        describe('when command is successful', function () {
            it('must resolve with stdout, stderr, and exit code', async function () {
                const mockSpawn: SpawnFunction = (cmd: string, args: string[]) => {
                    const mp = new MockChildProcess(cmd, args)

                    process.nextTick(() => {
                        mp.stdout.emit('data', 'Hello World\n')
                        mp.mockClose(0)
                    })

                    return mp as unknown as ChildProcess
                }

                const result = await runCommand(['echo', 'Hello World'], mockSpawn)

                expect(result).toHaveProperty('stdout')
                expect(result).toHaveProperty('stderr')
                expect(result).toHaveProperty('code')
                expect(result.code).toBe(0)
            })
        })
    })
})
