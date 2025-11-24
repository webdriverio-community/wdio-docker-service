import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { spawn as nodeSpawn } from 'node:child_process'

type SpawnFunction = ((
    command: string,
    args: string[],
    options?: SpawnOptions
) => ChildProcess) | typeof nodeSpawn

type CommandResult = {
    stdout: string;
    stderr: string;
    code: number;
}

/**
 * Runs a continuous shell process
 * @param cmd Shell command
 */
export function runProcess(cmd: string[], spawn: SpawnFunction = nodeSpawn) {
    return new Promise<ChildProcess>((resolve, reject) => {
        const [app, ...args] = cmd
        const childProcess = spawn(app, args)

        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve(childProcess)
            } else {
                reject(new Error(`Process exited with code ${code}`))
            }
        })

        childProcess.on('error', (err) => {
            reject(err)
        })

        process.nextTick(() => {
            resolve(childProcess)
        })
    })
}

/**
 * Runs a shell command
 * @param cmd Shell command
 */
export function runCommand(cmd: string[], spawn: SpawnFunction = nodeSpawn): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const [app, ...args] = cmd
        const childProcess = spawn(app, args)

        let stdout = ''
        let stderr = ''

        // Capture stdout and stderr
        childProcess.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString()
        })

        childProcess.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString()
        })

        childProcess.on('error', (err) => {
            reject(err)
        })

        childProcess.on('close', (code) => {
            // Handle null code (process was killed)
            const exitCode = code ?? -1

            if (exitCode === 0) {
                resolve({ stdout, stderr, code: exitCode })
            } else {
                reject(new Error(`Command '${cmd.join(' ')}' exited with code ${exitCode}`))
            }
        })
    })
}
