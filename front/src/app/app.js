angular.module('app', [
    'templates-app',
    'templates-common',
    'app.home',
    'app.logging',
    'ui.router',
    'ui.bootstrap',
    'ngResource',
    'ngCookies'
])

    .config(function myAppConfig($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
    })

    .run(function run($http, $cookies) {
        $http.defaults.headers.post['X-CSRFToken'] = $cookies['csrftoken'];
    })

    .controller('AppCtrl', function ($scope) {


    });

