module.exports = {
  // loader: ["ts-node/esm"],
  extensions: ["ts"],
  spec: "test/unit/**/*",
  require: ["tsx"],
  import: ["tsx/esm"],
  exit: true,
  timeout: 10000,
};