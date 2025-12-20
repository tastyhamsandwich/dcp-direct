import type { Config } from "jest";
import { readFileSync as ReadFileSync } from "node:fs";
import { pathsToModuleNameMapper as PathsToModuleNameMapper } from "ts-jest";

const tsConfig = JSON.parse(
  ReadFileSync(new URL("./tsconfig.json", import.meta.url), "utf-8")
);

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { tsconfig: "<rootDir>/tsconfig.jest.json", useESM: true },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!uuid)/"],
  moduleNameMapper: {
    ...PathsToModuleNameMapper(tsConfig.compilerOptions?.paths ?? {}, {
      prefix: "<rootDir>/",
    }),
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  clearMocks: true,
};

export default config;
