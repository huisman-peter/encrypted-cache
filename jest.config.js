module.exports = {
  transform: {
    '^.+\\.tsx?$': 'esbuild-jest'
  },
  testEnvironment: 'jsdom',
};
