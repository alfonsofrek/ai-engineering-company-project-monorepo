/** Jest for the backoffice's TypeScript helpers (lib/). Run with `npm test`. */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  collectCoverageFrom: ["lib/**/*.ts"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx", module: "commonjs", esModuleInterop: true } }] },
};
