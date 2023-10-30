module.exports = function (api) {
    api.cache(true);
    const presets = [
        [
            '@babel/preset-env',
            {
                debug: false,
                modules: false,
                targets: {
                    node: '18',
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
