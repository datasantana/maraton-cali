const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === "production" ? "/maraton-cali/" : "/",
  chainWebpack: config => {
    // Import .csv files as raw text (replaces raw-loader in webpack 5)
    config.module
      .rule('csv')
      .test(/\.csv$/)
      .type('asset/source');
    // Import .geojson files as JSON
    config.module
      .rule('geojson')
      .test(/\.geojson$/)
      .type('json');
  },
})