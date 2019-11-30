module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true
  },
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "no-unused-expressions": "off",
    "import/no-unresolved": "off",
    "import/no-extraneous-dependencies": "off",
    "no-console": "off",
    "no-debugger": "off"
  }
};
