/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
    /**
     * The `build_dir` folder is where our projects are compiled during
     * development and the `compile_dir` folder is where our app resides once it's
     * completely built.
     */
    build_dir: 'build',
    compile_dir: 'bin',

    /**
     * This is a collection of file patterns that refer to our app code (the
     * stuff in `src/`). These file paths are used in the configuration of
     * build tasks. `js` is all project javascript, less tests. `ctpl` contains
     * our reusable components' (`src/common`) template HTML files, while
     * `atpl` contains the same, but for our app's code. `html` is just our
     * main HTML file, `less` is our main stylesheet, and `unit` contains our
     * app's unit tests.
     */
    app_files: {
        js: [ 'src/**/*.js', '!src/**/*.spec.js', '!src/assets/**/*.js'],
        jsunit: [ 'src/**/*.spec.js' ],

        coffee: [ 'src/**/*.coffee', '!src/**/*.spec.coffee' ],
        coffeeunit: [ 'src/**/*.spec.coffee' ],

        atpl: [ 'src/app/**/*.tpl.html' ],
        ctpl: [ 'src/common/**/*.tpl.html' ],

        html: [ 'src/index.html' ],
        sass: ['src/sass/ie.sass', 'src/sass/print.sass', 'src/sass/screen.sass']
    },

    /**
     * This is a collection of files used during testing only.
     */
    test_files: {
        js: [
            'node_modules/sinon/pkg/sinon.js',
            'src/test-lib.js'
        ]
    },

    /**
     * This is the same as `app_files`, except it contains patterns that
     * reference vendor code (`vendor/`) that we need to place into the build
     * process somewhere. While the `app_files` property ensures all
     * standardized files are collected for compilation, it is the user's job
     * to ensure non-standardized (i.e. vendor-related) files are handled
     * appropriately in `vendor_files.js`.
     *
     * The `vendor_files.js` property holds files to be automatically
     * concatenated and minified with our project source files.
     *
     * The `vendor_files.css` property holds any CSS files to be automatically
     * included in our app.
     *
     * The `vendor_files.assets` property holds any assets to be copied along
     * with our app's assets. This structure is flattened, so it is not
     * recommended that you use wildcards.
     */
    vendor_files: {
        js: [
            'vendor/pouchdb/dist/pouchdb-nightly.js',
            'vendor/jquery/dist/jquery.js',
            'vendor/jquery-ui/jquery-ui.js',
            'vendor/underscore/underscore.js',
            'vendor/async/lib/async.js',
            'vendor/angular/angular.js',
            'vendor/ng-file-upload/angular-file-upload.js',
            'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'vendor/angular-ui-sortable/sortable.js',
            'vendor/angular-ui-router/release/angular-ui-router.js',
            'vendor/angular-cookies/angular-cookies.js',
            'vendor/angular-resource/angular-resource.js',
            'vendor/angular-ui-utils/modules/route/route.js',
            'vendor/bootstrap/dist/js/bootstrap.js',
            'vendor/modernizr/modernizr.js',
            'vendor/angular-local-storage/angular-local-storage.js',
            'vendor/angular-base64/angular-base64.js',
            'vendor/restangular/src/restangular.js',
            'vendor/angular-timer/dist/angular-timer.js'
        ],
        css: [
            'vendor/bootstrap/dist/css/bootstrap-theme.css',
            'vendor/bootstrap/dist/css/bootstrap.css',
            'src/css/**/*.css',
            'vendor/font-awesome/css/font-awesome.css'
        ],
        sass: [
        ],
        assets: [
            'vendor/bootstrap/dist/fonts/*',
            'vendor/font-awesome/fonts/*'
        ]
    }
};
