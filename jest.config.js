module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^phaser$': '<rootDir>/__mocks__/phaser.js',
    '^@Objects(.*)$': '<rootDir>/src/objects$1',
    '^@Data(.*)$': '<rootDir>/src/data$1',
    '^@Scenes(.*)$': '<rootDir>/src/scenes$1',
    '^@Utilities(.*)$': '<rootDir>/src/utilities$1',
  },
  // Transform everything including node_modules (needed for ESM packages: uuid, @spriteworld/pokemon-data)
  transformIgnorePatterns: [],
  roots: ['<rootDir>/src'],
};
