import camelToDash from './camelToDash';

const RX_SPACES = /(\s)/g;
const RX_IS_ESCAPED = /^(["'])([^"']+)(["'])$/;

/**
 * @param {Object} opt Options to serialize
 * @return {Array<string>}
 */

export function serializeOptions(opt) {
    return Object.keys(opt).reduce((acc, key) => {
        const fixedKey = camelToDash(key);
        const value = sanitizeValue(opt[key]);
        const option = serializeOption(fixedKey, value);
        if (option) {
            if (Array.isArray(option)) {
                return acc.concat(option);
            }
            acc.push(option);
        }
        return acc;
    }, []);
}

/**
 * @param {String} key
 * @param {boolean | string | Array<any>} value
 * @return {Array<string>}
 */
export function serializeOption(key, value) {
    const prefix = key.length > 1 ? '--' : '-';

    if (typeof value === 'boolean') {
        return value ? [`${ prefix }${ key }`] : [];
    }

    if (typeof value === 'string') {
        return [`${ prefix }${ key }`, `${ value }`];
    }

    if (Array.isArray(value)) {
        return value.reduce((acc, item) => acc.concat([`${ prefix }${ key }`, `${ item }`]), []);
    }

    return [];
}

/**
 * @param {*} value
 * @return {void | string | *}
 */
export function sanitizeValue(value) {
    if (typeof value !== 'string' || RX_IS_ESCAPED.test(value)) {
        return value;
    }

    return process.platform === 'win32' ? value : value.replace(RX_SPACES, '\\ ');
}

export default serializeOptions;
