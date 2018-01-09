import { spawn } from 'child_process';

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
        const process = spawn(app, args);

        process.on('error', (err) => {
            reject(err);
        });

        resolve(process);
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
        const process = spawn(app, args);

        process.on('error', (err) => {
            reject(err);
        });

        process.on('close', (code) => {
            if (!code) {
                resolve(process);
                return;
            }

            reject(new Error(`Command '${ cmd }' exited with code ${ code }`));
        });
    });
}
