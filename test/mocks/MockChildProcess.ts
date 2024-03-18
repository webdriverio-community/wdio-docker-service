import { Readable } from 'stream';
import { spy, SinonSpy } from 'sinon';
import { ChildProcess } from 'child_process';

class MockChildProcess extends ChildProcess {
    cmd: string;
    args?: string[];
    stdout: Readable;
    stderr: Readable;
    kill: SinonSpy;

    constructor(cmd: string, args: readonly string[] = []) {
        super();

        this.cmd = cmd;
        this.args = [...args];

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
