/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "prettier",
  ],
  // We're using vitest which has a very similar API to jest
  // (so the linting plugins work nicely), but we have to
  // set the jest version explicitly.
  settings: {
    jest: {
      version: 28,
    },
  },
  overrides: [
    {
      files: "tests/*.test.*",
      extends: ["@remix-run/eslint-config/jest-testing-library"],
    },
    {
      files: "e2e/*.spec.*",
      extends: ["plugin:playwright/playwright-test"],
    },
  ],
};
