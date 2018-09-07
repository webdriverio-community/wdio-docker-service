const RX_NON_WHITE_SP = /\W+/g;
const RX_ALPHA_NUM = /([a-z\d])([A-Z])/g;

/**
 * Converts camel case to dashes
 * @param {String} str String to convert
 * @return {String}
 */
function camelToDash(str) {
    return str.replace(RX_NON_WHITE_SP, '-').replace(RX_ALPHA_NUM, '$1-$2').toLowerCase();
}

export default camelToDash;
