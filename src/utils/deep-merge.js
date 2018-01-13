/**
 * Merges docker options
 * @param {Object} dest Destination object
 * @param {Object} sources
 * @return {Object}
 */
function deepMerge(dest = {}, ...sources) {
    return sources.reduce((acc, option) => {
        Object.keys(option).forEach((key) => {
            const value = option[key];
            if (Array.isArray(value) && Array.isArray(acc[key])) {
                acc[key] = acc[key].concat(value);
                return;
            }

            if (typeof value === 'object' && typeof acc[key] === 'object') {
                deepMerge(acc[key], value);
                return;
            }

            acc[key] = value;
        });

        return acc;
    }, dest);
}

export default deepMerge;
