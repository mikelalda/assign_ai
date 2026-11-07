// Jest runs the modules of amd/src as they are. The modules of this plugin are
// loaded from amd/src; those of Moodle (core/..., editor_tiny/...) are replaced
// by the small fakes in mocks/.
module.exports = {
    rootDir: __dirname,
    roots: ['<rootDir>/specs'],
    testEnvironment: require.resolve('jest-environment-jsdom'),
    transform: {
        '\\.js$': [require.resolve('babel-jest'), {
            configFile: false,
            babelrc: false,
            presets: [[require.resolve('@babel/preset-env'), {targets: {node: 'current'}}]],
        }],
    },
    moduleNameMapper: {
        '^local_assign_ai/(.*)$': '<rootDir>/../../amd/src/$1.js',
        '^(core|core_form|editor_tiny)/(.*)$': '<rootDir>/mocks/$1/$2.js',
    },
    setupFilesAfterEnv: ['<rootDir>/setup.js'],
    clearMocks: true,
};
