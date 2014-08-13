angular.module('app.home', [
    'ui.router',
    'app',
    'ui.bootstrap'
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

    .controller('HomeCtrl', function HomeController($scope, $log) {


    })

;
