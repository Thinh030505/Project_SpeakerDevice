export default {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current' // Target Node.js version hiện tại
                },
                modules: false  // Giữ ES Module, không chuyển về CommonJS
            }
        ]
    ]
};
