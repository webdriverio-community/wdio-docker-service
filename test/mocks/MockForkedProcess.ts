import { EventEmitter } from 'events';
import { spy, stub } from 'sinon';

class MockForkedProcess extends EventEmitter {
    connected: boolean;
    module: string;
    pid: number;
    send: unknown;
    disconnect: unknown;

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

    mockMessage(message: string) {
        this.emit('message', message);
    }
}

export default MockForkedProcess;
