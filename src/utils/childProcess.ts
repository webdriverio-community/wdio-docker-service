import { spawn, ChildProcess } from 'child_process';

/**
 * Runs a continuous shell process
 * @param cmd Shell command
 */
export function runProcess(cmd: string[]) {
    return new Promise<ChildProcess>((resolve, reject) => {
        const [app, ...args] = cmd;
        const childProcess = spawn(app, args);

        childProcess.on('error', (err) => {
            reject(err);
        });

        process.nextTick(() => {
            resolve(childProcess);
        });
    });
}

/**
 * Runs a shell command
 * @param cmd Shell command
 */
export function runCommand(cmd: string[]) {
    return new Promise<ChildProcess>((resolve, reject) => {
        const [app, ...args] = cmd;
        const childProcess = spawn(app, args, { stdio: 'ignore' });

        childProcess.on('error', (err) => {
            reject(err);
        });

        childProcess.on('close', (code) => {
            if (!code) {
                resolve(childProcess);
                return;
            }

            reject(new Error(`Command '${cmd.join(' ')}' exited with code ${code}`));
        });
    });
}
