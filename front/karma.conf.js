module.exports = function ( karma ) {
  karma.set({
    basePath: './',
    files: [
      'node_modules/es5-shim/es5-shim.min.js', 
      'pouchdb-2.2.4-prerelease.js',
      'src/app/pouch/pouch.spec.js'
    ],
    frameworks: [ 'mocha', 'chai' ],
    plugins: [ 
               'karma-mocha',
               'karma-chai',
               'karma-phantomjs-launcher',
               'karma-chrome-launcher'
               ],
    reporters: 'dots',
    port: 9018,
    runnerPort: 9100,
    urlRoot: '/',
    autoWatch: false,
    browsers: [
      'Chrome'
    ]
  });
};


