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

    .controller('AppCtrl', function ($scope, $cookies) {

        $scope.settings = {
            apiKey: $cookies.apiKey
        };

        $scope.$watch('currApiKey', function (newValue) {
            $cookies.apiKey = newValue;
        });

    });

