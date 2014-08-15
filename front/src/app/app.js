angular.module('app', [
    'templates-app',
    'templates-common',
    'app.home',
    'app.about',
    'app.support',
    'app.settings',
    'app.stats',
    'app.logging',
    'app.tasks',
    'app.debug',
    'ui.router',
    'ui.bootstrap',
    'ngResource',
    'ngCookies',
    'ctimer'
])

    .config(function myAppConfig($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/home');
    })

    .factory('Timer', function ($rootScope, jlog) {

        $rootScope.timerRunning = true;

//        $scope.startTimer = function (){
//            $scope.timerRunning = true;
//        };
//
//        $scope.stopTimer = function (){
//            $scope.timerRunning = false;
//        };


    })

    .controller('AppCtrl', function ($scope, $cookieStore, jlog, $rootScope) {


        var $log = jlog.loggerWithName('AppCtrl');

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

        $scope.$on('timer-tick', function (event, args) {
            $rootScope.$broadcast('timer', args);
        });




        $scope.startTimer = function (){
            $scope.$broadcast('timer-stop');
            $scope.$broadcast('timer-start');
            $scope.$broadcast('timer-stop');
            $rootScope.$broadcast('timer', {
                millis: 0
            });
        };

        $scope.resumeTimer = function (){
            $scope.$broadcast('timer-resume');
        };

        $scope.stopTimer = function (){
            $scope.$broadcast('timer-stop');
        };


    })

    .directive('updateTitle', function ($rootScope) {
        return {
            link: function (scope, element) {

                var listener = function (event, toState) {
                    var title = 'Default Title';
                    if (toState.data && toState.data.pageTitle) title = toState.data.pageTitle;
                    element.text(title)
                };

                $rootScope.$on('$stateChangeStart', listener);
            }
        }
    })

    .directive('loading', function () {
        return {
            restrict: 'AE',
            replace: 'false',
            template: '<div class="loading"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
        }
    })
;


