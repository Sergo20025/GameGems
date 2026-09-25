/** @type {import('jest').Config} */
export default {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  moduleFileExtensions: ["js", "jsx"],
  moduleNameMapper: {
    "^.+\\.(css|less|scss|sass)$": "identity-obj-proxy"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],  // ⬅️ вот здесь укажи
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"]
};