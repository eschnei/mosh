// CommonJS format because there's no "type": "module" in package.json.
// electron-vite bundles each context independently, so this file is read by
// Vite's renderer pipeline as a Node config file.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
