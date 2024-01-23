module.exports = {
  extension: ["ts"],
  spec: "test/unit/**/*.ts",
  // require: "ts-node/esm",
  "node-option": [ 
    // "experimental-specifier-resolution=node",
    "loader=ts-node/esm"
  ],
};