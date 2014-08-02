angular.module('app', [
    'templates-app',
    'templates-common',
    'app.home',
    'app.settings',
    'app.stats',
    'app.logging',
    'ui.router',
    'ui.bootstrap',
    'ngResource',
    'ngCookies'
])

    .config(function myAppConfig($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
    })

    .controller('AppCtrl', function ($scope, $log) {
    });

