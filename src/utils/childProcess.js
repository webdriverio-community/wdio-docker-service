import { spawn } from 'child_process';
import Promise from 'bluebird';

const SPACE = ' ';

/**
 * Runs continuous shell process
 * @param {String} cmd Shell command
 * @return {Promise<process>}
 */
export function runProcess(cmd) {
    return new Promise((resolve, reject) => {
        const commands = cmd.split(SPACE);
        const [app, ...args] = commands;
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
 * @param {String} cmd Shell command
 * @return {Promise<process>}
 */
export function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        const commands = cmd.split(SPACE);
        const [app, ...args] = commands;
        const childProcess = spawn(app, args);
        let stdout = '';

        childProcess.stdout.on('data', (data) => {
            stdout += data;
        });

        childProcess.on('error', (err) => {
            reject(err);
        });

        childProcess.on('close', (code) => {
            if (!code) {
                resolve(stdout);
                return;
            }

            reject(new Error(`Command '${ cmd }' exited with code ${ code }`));
        });
    });
}
