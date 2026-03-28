import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Mock CSS imports — Jest can't process CSS
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.ts",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: { jsx: "react-jsx" },
      // Don't type-check during tests — faster
      diagnostics: false,
    }],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  // Tell Jest to ignore these folders
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  // Ignore transforming node_modules except stellar-sdk which uses ESM
  transformIgnorePatterns: [
    "/node_modules/(?!(@stellar|@creit-tech)/)",
  ],
};

export default config;