angular.module('app', [
    'templates-app',
    'templates-common',
    'app.home',
    'app.settings',
    'app.stats',
    'app.logging',
    'app.debug',
    'ui.router',
    'ui.bootstrap',
    'ngResource',
    'ngCookies'
])

    .config(function myAppConfig($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
    })

    .controller('AppCtrl', function ($scope, $cookieStore) {

        var mobileView = 992;

        $scope.getWidth = function () { return window.innerWidth; };

        $scope.$watch($scope.getWidth, function (newValue) {
            if (newValue >= mobileView) {
                if (angular.isDefined($cookieStore.get('toggle'))) {
                    $scope.toggle = $cookieStore.get('toggle') != false;
                }
                else {
                    $scope.toggle = true;
                }
            }
            else {
                $scope.toggle = false;
            }

        });

        $scope.toggleSidebar = function () {
            $scope.toggle = !$scope.toggle;

            $cookieStore.put('toggle', $scope.toggle);
        };

        window.onresize = function () { $scope.$apply(); };

    });

