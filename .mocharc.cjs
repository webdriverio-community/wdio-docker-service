/* eslint-disable no-undef */
module.exports = {
    extensions: ['ts'],
    spec: 'test/unit/**/*.ts',
    require: ['tsx'],
    import: ['tsx/esm'],
    exit: true,
    timeout: 10000,
};