import camelToDash from './camelToDash.js'

const RX_SPACES = /(\s)/g
const RX_IS_ESCAPED = /^(["'])([^"']+)(["'])$/

/**
 * @param opt Options to serialize
 * @return
 */

export function serializeOptions(opt: Record<string, unknown>) {
    return Object.keys(opt).reduce((acc, key) => {
        const fixedKey = camelToDash(key)
        const value = sanitizeValue(opt[key])
        const option = serializeOption(fixedKey, value)
        if (option) {
            if (Array.isArray(option)) {
                return acc.concat(option as never[])
            }
            acc.push(option as never)
        }
        return acc
    }, [])
}

export function serializeOption(key: string, value: unknown): unknown[] {
    const prefix = key.length > 1 ? '--' : '-'

    if (typeof value === 'boolean' && value) {
        return [`${ prefix }${ key }`]
    }

    if (typeof value === 'string') {
        return [`${ prefix }${ key }`, `${ value }`]
    }

    if (Array.isArray(value)) {
        return value.reduce((acc, item) => acc.concat([`${ prefix }${ key }`, `${ item }`]), [])
    }

    return []
}

export function sanitizeValue(value: unknown) {
    if (typeof value !== 'string' || RX_IS_ESCAPED.test(value)) {
        return value
    }

    return process.platform === 'win32' ? value : value.replace(RX_SPACES, '\\ ')
}

export default serializeOptions
