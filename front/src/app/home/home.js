angular.module('app.home', [
    'ui.router',
    'app',
    'ui.bootstrap',
    'timer'
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

    .controller('HomeCtrl', function HomeController($scope, $rootScope, jlog) {

        var $log = jlog.loggerWithName('HomeCtrl');

        $scope.timer = {
            hours: 0,
            minutes: 0,
            seconds: 0
        };

        $scope.pad = function (num) {
            return ("00" + num).substr(-2,2);
        };

        $rootScope.$on('timer', function (event, args) {
            var millSeconds = args.millis;
            $scope.$apply(function () {
                $scope.timer.seconds = Math.floor(millSeconds / 1000) % 60;
                $scope.timer.minutes = Math.floor($scope.timer.seconds / 60) % 60;
                $scope.timer.hours = Math.floor($scope.timer.hours / 60);
            });

            $log.debug('HomeCtrl received timer event', $scope.timer);

        });

    })

;
