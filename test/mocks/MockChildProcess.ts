import { Readable } from 'stream';
import { EventEmitter } from 'events';
import { vi } from 'vitest';
import { spawn } from 'child_process';

class MockChildProcess extends EventEmitter {
    cmd: Parameters<typeof spawn>['0'];
    args?: Parameters<typeof spawn>['1'];
    opts?: Parameters<typeof spawn>['2'];
    stdout: Readable;
    stderr: Readable;
    kill: any; 

    constructor(
        cmd: Parameters<typeof spawn>['0'], 
        args: Parameters<typeof spawn>['1'] = [], 
        options: Parameters<typeof spawn>['2'] = {}
    ) {
        super();

        this.cmd = cmd;
        this.args = [...args];
        this.opts = options;

        this.stdout = new EventEmitter() as any;
        this.stdout.setEncoding = vi.fn();

        this.stderr = new EventEmitter() as any;

        this.kill = vi.fn();
    }

    mockError(error = 'mock error') {
        this.emit('error', new Error(error));
    }

    mockClose(code = 0) {
        this.emit('close', code);
    }
}

export default MockChildProcess;
