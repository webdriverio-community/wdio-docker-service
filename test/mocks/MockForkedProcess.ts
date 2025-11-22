import { ChildProcess } from 'node:child_process'
import { vi } from 'vitest'

class MockForkedProcess extends ChildProcess {
    connected: boolean
    module: string
    pid: number

    constructor(module: string) {
        super()

        this.connected = true
        this.module = module
        this.pid = Math.random() * 1000
        this.send = vi.fn()
        this.disconnect = vi.fn().mockImplementation(() => {
            this.connected = false
        })
    }

    mockError(error = 'mock error') {
        this.emit('error', new Error(error))
    }

    mockMessage(message: string | Record<string, unknown>) {
        this.emit('message', message)
    }
}

export default MockForkedProcess
