angular.module('app.home', [
    'ui.router',
    'app',
    'ui.bootstrap',
    'timer',
    'app.tasks'
])

    .config(function config($stateProvider) {
        $stateProvider.state('home', {
            url: '/home',
            views: {
                "main": {
                    controller: 'HomeCtrl',
                    templateUrl: 'home/home.tpl.html'
                }
            },
            data: { pageTitle: 'Home' }
        });
    })

    .controller('HomeCtrl', function HomeController($scope, $rootScope, AsanaData, jlog) {
        var $log = jlog.loggerWithName('HomeCtrl');
    })

;
