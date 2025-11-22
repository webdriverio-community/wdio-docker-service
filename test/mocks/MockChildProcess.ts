import type { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import { vi } from 'vitest'
import type { spawn } from 'node:child_process'

class MockChildProcess extends EventEmitter {
    cmd: Parameters<typeof spawn>['0']
    args?: Parameters<typeof spawn>['1']
    opts?: Parameters<typeof spawn>['2']
    stdout: Readable
    stderr: Readable
    kill: unknown

    constructor(
        cmd: Parameters<typeof spawn>['0'],
        args: Parameters<typeof spawn>['1'] = [],
        options: Parameters<typeof spawn>['2'] = {}
    ) {
        super()

        this.cmd = cmd
        this.args = [...args]
        this.opts = options

        this.stdout = new EventEmitter() as unknown as Readable
        this.stdout.setEncoding = vi.fn()

        this.stderr = new EventEmitter() as unknown as Readable

        this.kill = vi.fn()
    }

    mockError(error = 'mock error') {
        this.emit('error', new Error(error))
    }

    mockClose(code = 0) {
        this.emit('close', code)
    }
}

export default MockChildProcess
