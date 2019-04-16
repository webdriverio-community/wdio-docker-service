module.exports = function (api) {
    api.cache(true);
    const presets = [
        [
            '@babel/preset-env',
            {
                debug: false,
                targets: {
                    node: '8',
                },
            },
        ],
    ];

    return {
        babelrcRoots: [
            __dirname,
        ],
        ignore: [
            './node_modules/*',
        ],
        presets
    };
};
