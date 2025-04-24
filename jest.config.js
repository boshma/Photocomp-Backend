/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    // Ensure TypeScript paths mappings are handled correctly
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // Add roots to help with module resolution
    roots: ['<rootDir>'],
    modulePaths: ['<rootDir>'],
};
