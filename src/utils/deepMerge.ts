/**
 * Merges docker options
 * @param dest Destination object 
 * @param sources Source objects
 */
function deepMerge(dest = {}, ...sources: Record<string, unknown>[]) {
    return sources.reduce((acc, option) => {
        Object.keys(option).forEach((key) => {
            const value = option[key];
            if (Array.isArray(value) && Array.isArray(acc[key])) {
                acc[key] = (acc[key] as unknown[]).concat(value);
                return;
            }

            if (typeof value === 'object' && typeof acc[key] === 'object') {
                deepMerge(acc[key] as Record<string, unknown>, value as Record<string, unknown>);
                return;
            }

            acc[key] = value;
        });

        return acc;
    }, dest);
}

export default deepMerge;
