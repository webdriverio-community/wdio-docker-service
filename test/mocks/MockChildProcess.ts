import { Readable } from 'stream';
import { spy, SinonSpy } from 'sinon';
import { ChildProcess, spawn } from 'child_process';

class MockChildProcess extends ChildProcess {
    cmd: Parameters<typeof spawn>['0'];
    args?: Parameters<typeof spawn>['1'];
    opts?: Parameters<typeof spawn>['2'];
    stdout: Readable;
    stderr: Readable;
    kill: SinonSpy;

    constructor(
        cmd: Parameters<typeof spawn>['0'], 
        args: Parameters<typeof spawn>['1'] = [], 
        options: Parameters<typeof spawn>['2'] = {}
    ) {
        super();

        this.cmd = cmd;
        this.args = [...args];
        this.opts = options;

        this.stdout = new Readable({
            read() {
                this.push(null);
            }
        });

        this.stderr = new Readable({
            read() {
                this.push(null);
            }
        });

        this.kill = spy();
    }

    mockError(error = 'mock error') {
        this.emit('error', new Error(error));
    }

    mockClose(code = 0) {
        this.emit('close', code);
    }
}

export default MockChildProcess;
