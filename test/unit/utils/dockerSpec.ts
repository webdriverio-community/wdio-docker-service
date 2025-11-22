import path from 'node:path'
import fs from 'fs-extra'
import type { MockInstance } from 'vitest'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import DockerEventsListener from '@root/utils/dockerEventsListener.js'
import { DockerForTests } from '@root/utils/docker.js'
import * as ChildProcessUtils from '@root/utils/childProcess.js'
import PingUtils from '@root/utils/ping.js'

vi.mock('@root/utils/childProcess.js')
vi.mock('@root/utils/ping.js')
vi.mock('fs-extra')

describe('Docker', function () {
    const SPACE = ' '
    let Docker: typeof DockerForTests

    // Access mocks
    const runProcessMock = ChildProcessUtils.runProcess as unknown as MockInstance
    const runCommandMock = ChildProcessUtils.runCommand as unknown as MockInstance
    const pingMock = PingUtils as unknown as MockInstance

    beforeAll(() => {
        Docker = DockerForTests
    })

    beforeEach(() => {
        vi.resetAllMocks()
    })

    describe('#constructor', function () {
        describe('when image argument is not provided', function () {
            const tryToInstantiate = () => {
                // @ts-expect-error Checking for error case here
                new Docker()
            }

            it('must throw an error', function () {
                expect(tryToInstantiate).toThrow()
            })
        })

        describe('when image argument is provided', function () {
            describe('when optional arguments are not provided', function () {
                it('must use defaults', function () {
                    const docker = new Docker('my-image')
                    const cidfile = path.join(process.cwd(), 'my_image.cid')

                    expect(docker.args).toEqual(undefined)
                    expect(docker.cidfile).toEqual(cidfile)
                    expect(docker.command).toEqual(undefined)
                    expect(docker.debug).toEqual(false)
                    expect(docker.healthCheck).toEqual({})
                    expect(docker.logger).toEqual(console)
                    expect(docker.process).toEqual(null)
                    expect(docker.options).toEqual({
                        rm: true,
                        cidfile,
                    })
                })
            })

            describe('when docker options are set', function () {
                it('must properly translate them into a docker run command', function () {
                    const docker = new Docker('my-image', {
                        options: {
                            d: true,
                            p: ['1234:1234'],
                            // @ts-expect-error allowing unknown options
                            foo: 'bar',
                        },
                    })

                    expect(docker.dockerRunCommand.join(SPACE)).toEqual(
                        `docker run --cidfile ${docker.cidfile} --rm -d -p 1234:1234 --foo bar my-image`
                    )
                })
            })

            describe('when docker command argument is provided ', function () {
                it('must place it after image name ', function () {
                    const docker = new Docker('my-image', { command: 'test' })

                    expect(docker.dockerRunCommand.join(SPACE)).toEqual(
                        `docker run --cidfile ${docker.cidfile} --rm my-image test`
                    )
                })
            })

            describe('when docker args argument is provided ', function () {
                it('must place it after image name ', function () {
                    const docker = new Docker('my-image', { args: '-foo' })

                    expect(docker.dockerRunCommand.join(SPACE)).toEqual(
                        `docker run --cidfile ${docker.cidfile} --rm my-image -foo`
                    )
                })
            })

            describe('when both command and args arguments are provided', function () {
                it('must place both of them after image name where command is followed by args', function () {
                    const docker = new Docker('my-image', {
                        command: 'test',
                        args: '-foo',
                    })
                    expect(docker.dockerRunCommand.join(SPACE)).toEqual(
                        `docker run --cidfile ${docker.cidfile} --rm my-image test -foo`
                    )
                })
            })

            describe('when CWD contains spaces', function () {
                let stubCwd: MockInstance

                beforeEach(function () {
                    stubCwd = vi.spyOn(process, 'cwd').mockReturnValue('/User/johndoe/test dir/')
                })

                afterEach(function () {
                    stubCwd.mockRestore()
                })

                it('must escape cidfile path', function () {
                    const docker = new Docker('my-image', {
                        command: 'test',
                        args: '-foo',
                    })
                    const cmd =
                        process.platform === 'win32'
                            ? 'docker run --cidfile \\User\\johndoe\\test dir\\my_image.cid --rm my-image test -foo'
                            : 'docker run --cidfile /User/johndoe/test\\ dir/my_image.cid --rm my-image test -foo'
                    expect(docker.dockerRunCommand.join(SPACE)).toEqual(cmd)
                })
            })
        })
    })

    describe('#stop', function () {
        const killSpy = vi.fn()
        const mockProcess = {
            kill: killSpy,
        }
        let stubRemoveStaleContainer: MockInstance
        let stubDisconnect: MockInstance

        beforeEach(function () {
            stubRemoveStaleContainer = vi.spyOn(Docker.prototype, '_removeStaleContainer').mockResolvedValue(undefined)
            stubDisconnect = vi.spyOn(DockerEventsListener.prototype, 'disconnect')
        })

        afterEach(function () {
            vi.restoreAllMocks()
        })

        it('must must process', async function () {
            const docker = new Docker('my-image')
            // @ts-expect-error Checking for error case here
            docker.process = mockProcess

            await docker.stop()
            expect(killSpy).toHaveBeenCalled()
            expect(docker.process).toEqual(null)
        })
    })

    describe('#run', function () {
        const mockProcess = {
            stdout: {
                on: vi.fn(),
            },
            stderr: {
                on: vi.fn(),
            },
            kill: vi.fn(),
        }

        let stubRemoveStaleContainer: MockInstance
        let stubReportWhenDockerIsRunning: MockInstance
        let stubConnect: MockInstance

        beforeEach(function () {
            runProcessMock.mockResolvedValue(mockProcess)

            stubRemoveStaleContainer = vi.spyOn(Docker.prototype, '_removeStaleContainer').mockResolvedValue(undefined)
            stubReportWhenDockerIsRunning = vi.spyOn(Docker.prototype, '_reportWhenDockerIsRunning').mockResolvedValue(undefined)
            stubConnect = vi.spyOn(DockerEventsListener.prototype, 'connect').mockImplementation(() => {})
        })

        afterEach(function () {
            vi.restoreAllMocks()
        })

        describe('when image is not yet pulled (first time)', function () {
            let stubIsImagePresent: MockInstance
            let stubPullImage: MockInstance

            beforeEach(function () {
                stubIsImagePresent = vi.spyOn(Docker.prototype, '_isImagePresent').mockRejectedValue(new Error('Not found'))
                stubPullImage = vi.spyOn(Docker.prototype, '_pullImage').mockResolvedValue({ code: 0, stdout: '', stderr: '', command: '' })
            })

            it('must attempt to pull image', function () {
                const docker = new Docker('my-image')

                return docker.run().then(() => {
                    expect(stubPullImage).toHaveBeenCalled()
                })
            })
        })

        describe('when image is already pulled', function () {
            let stubIsImagePresent: MockInstance
            let stubPullImage: MockInstance

            beforeEach(function () {
                stubIsImagePresent = vi.spyOn(Docker.prototype, '_isImagePresent').mockResolvedValue({
                    code: 0,
                    stdout: '',
                    stderr: '',
                    command: ''
                })
                stubPullImage = vi.spyOn(Docker.prototype, '_pullImage').mockResolvedValue({ code: 0, stdout: '', stderr: '', command: '' })
            })

            it('must just run the command', function () {
                const docker = new Docker('my-image')

                return docker.run().then(() => {
                    expect(stubPullImage).not.toHaveBeenCalled()
                    expect(runProcessMock).toHaveBeenCalled()
                })
            })

            it('must emit processCreated event', function () {
                const processCreatedSpy = vi.fn()
                const docker = new Docker('my-image')
                docker.on('processCreated', processCreatedSpy)

                return docker.run().then(() => {
                    expect(runProcessMock).toHaveBeenCalled()
                    expect(processCreatedSpy).toHaveBeenCalled()
                })
            })
        })
    })

    describe('#stopContainer', function () {
        beforeEach(function () {
            runCommandMock.mockResolvedValue(undefined)
        })

        it('must call docker command to stop running conrainer', function () {
            return Docker.stopContainer('123').then(() => {
                expect(runCommandMock).toHaveBeenCalledWith(['docker', 'stop', '123'])
            })
        })
    })

    describe('#removeContainer', function () {
        beforeEach(function () {
            runCommandMock.mockResolvedValue(undefined)
        })

        it('must call docker command to stop running container', function () {
            return Docker.removeContainer('123').then(() => {
                expect(runCommandMock).toHaveBeenCalledWith(['docker', 'rm', '123'])
            })
        })
    })

    describe('#_removeStaleContainer', function () {
        let stubRemove: MockInstance

        beforeEach(function () {
            stubRemove = fs.remove as unknown as MockInstance
            stubRemove.mockResolvedValue(undefined)
            runCommandMock.mockResolvedValue(undefined)
        })

        describe('when cid file exists', function () {
            let stubReadFile: MockInstance

            beforeEach(function () {
                stubReadFile = fs.readFile as unknown as MockInstance
                stubReadFile.mockResolvedValue('123')
            })

            it('must remove stale container', function () {
                const docker = new Docker('my-image')

                return docker._removeStaleContainer().then(() => {
                    expect(stubReadFile).toHaveBeenCalledWith(docker.cidfile)
                    expect(stubRemove).toHaveBeenCalledWith(docker.cidfile)
                    expect(runCommandMock).toHaveBeenCalledWith(['docker', 'stop', '123'])
                    expect(runCommandMock).toHaveBeenCalledWith(['docker', 'rm', '123'])
                })
            })
        })

        describe('when cid file does not exist', function () {
            let stubReadFile: MockInstance

            beforeEach(function () {
                stubReadFile = fs.readFile as unknown as MockInstance
                stubReadFile.mockRejectedValue(new Error('File not found'))
            })

            it('must attempt to remove stale container', function () {
                const docker = new Docker('my-image')

                return docker._removeStaleContainer().catch(() => {
                    expect(stubReadFile).toHaveBeenCalledWith(docker.cidfile)
                    expect(stubRemove).toHaveBeenCalledWith(docker.cidfile)
                    expect(runCommandMock).not.toHaveBeenCalled()
                })
            })
        })
    })

    describe('#_pullImage', function () {
        beforeEach(function () {
            runCommandMock.mockResolvedValue(undefined)
        })

        it('must call runCommand', function () {
            const docker = new Docker('my-image')
            return docker._pullImage().then(() => {
                expect(runCommandMock).toHaveBeenCalledWith(['docker', 'pull', 'my-image'])
            })
        })
    })

    describe('#_isImagePresent', function () {
        beforeEach(function () {
            runCommandMock.mockResolvedValue(undefined)
        })

        it('must call runCommand', function () {
            const docker = new Docker('my-image')
            return docker._isImagePresent().then(() => {
                expect(runCommandMock).toHaveBeenCalledWith(['docker', 'inspect', 'my-image'])
            })
        })
    })

    describe('#_reportWhenDockerIsRunning', function () {
        describe('when healthCheck is not set', function () {
            beforeEach(function () {
                pingMock.mockRejectedValue(new Error('Ping failed'))
            })

            it('must resolve promise right away', async function () {
                const docker = new Docker('my-image')

                await docker._reportWhenDockerIsRunning()
                expect(pingMock).not.toHaveBeenCalled()
            })
        })

        describe('when healthCheck is provided', function () {
            const newUrl = new URL('http://localhost:8080')
            let spyClearTimeout: MockInstance

            beforeEach(function () {
                pingMock.mockResolvedValue(undefined)
                spyClearTimeout = vi.spyOn(global, 'clearTimeout')
            })

            afterEach(function () {
                spyClearTimeout.mockRestore()
            })

            it('must Ping the healthCheck url', function () {
                const docker = new Docker('my-image', {
                    healthCheck: newUrl.href,
                })

                return docker._reportWhenDockerIsRunning().then(() => {
                    expect(spyClearTimeout).toHaveBeenCalled()
                    expect(pingMock).toHaveBeenCalledWith(newUrl)
                })
            })
        })

        describe('when maxRetries is specified and url is unreachable', function () {
            let spyClearTimeout: MockInstance

            beforeEach(function () {
                pingMock.mockRejectedValue(new Error('Ping failed'))
                spyClearTimeout = vi.spyOn(global, 'clearTimeout')
            })

            afterEach(function () {
                spyClearTimeout.mockRestore()
            })

            it('must Ping same number of times as maxRetries', function () {
                const docker = new Docker('my-image', {
                    healthCheck: {
                        url: 'http://localhost:8080',
                        maxRetries: 3,
                    },
                })

                return docker._reportWhenDockerIsRunning().catch(() => {
                    expect(spyClearTimeout).toHaveBeenCalled()
                    expect(pingMock).toHaveBeenCalledTimes(3)
                })
            }, 15000)
        })

        describe('when healthCheck is provided but is unreachable', function () {
            const newUrl = new URL('http://localhost:8080')
            let spyClearTimeout: MockInstance

            beforeEach(function () {
                pingMock.mockRejectedValue(new Error('Ping failed'))
                spyClearTimeout = vi.spyOn(global, 'clearTimeout')
            })

            afterEach(function () {
                spyClearTimeout.mockRestore()
            })

            it('must attempt to ping healthCheck url and then exit', async function () {
                const docker = new Docker('my-image', {
                    healthCheck: newUrl.href,
                })

                try {
                    await docker._reportWhenDockerIsRunning()
                } catch {
                    expect(spyClearTimeout).toHaveBeenCalled()
                    expect(pingMock).toHaveBeenCalledWith(newUrl)
                }
            }, 15000)
        })
    })
})
