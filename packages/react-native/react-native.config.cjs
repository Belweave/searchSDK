module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        sourceDir: require('path').join(__dirname, 'android'),
        packageImportPath: 'import dev.belweave.searchsdk.SearchSDKPackage;',
        packageInstance: 'new SearchSDKPackage()',
      },
    },
  },
};
