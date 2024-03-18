import { ChildProcess } from 'child_process';
import { spy, stub } from 'sinon';

class MockForkedProcess extends ChildProcess {
    connected: boolean;
    module: string;
    pid: number;

    constructor(module: string) {
        super();

        this.connected = true;
        this.module = module;
        this.pid = Math.random() * 1000;
        this.send = spy();
        this.disconnect = stub().callsFake(() => {
            this.connected = false;
        });
    }

    mockError(error = 'mock error') {
        this.emit('error', new Error(error));
    }

    mockMessage(message: string | Record<string, unknown>) {
        this.emit('message', message);
    }
}

export default MockForkedProcess;
