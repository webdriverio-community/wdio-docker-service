import { exec } from 'child_process';
import Promise from 'bluebird';

/**
 * Runs continuous shell process
 * @param {String} cmd Shell command
 * @return {Promise<process>}
 */
export function runProcess(cmd) {
    return new Promise((resolve, reject) => {
        const childProcess = exec(cmd);

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
 * @param {String} cmd Shell command
 * @return {Promise<process>}
 */
export function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        let childProcess = exec(cmd, { shell: true });

        childProcess.on('error', (err) => {
            reject(err);
        });

        childProcess.on('close', (code) => {
            if (!code) {
                resolve(childProcess);
                return;
            }

            reject(new Error(`Command '${ cmd }' exited with code ${ code }`));
        });
    });
}
