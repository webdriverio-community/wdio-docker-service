import { spawn } from 'child_process';

/**
 * Runs continuous shell process
 * @param {String[]} cmd Shell command
 * @return {Promise<import('child_process').ChildProcess>}
 */
export function runProcess(cmd) {
    return new Promise((resolve, reject) => {
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
 * Runs shell command
 * @param {String[]} cmd Shell command
 * @return {Promise<import('child_process').ChildProcess>}
 */
export function runCommand(cmd) {
    return new Promise((resolve, reject) => {
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

            reject(new Error(`Command '${ cmd.join(' ') }' exited with code ${ code }`));
        });
    });
}
