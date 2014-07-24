angular.module('app', [
    'templates-app',
    'templates-common',
    'app.home',
    'app.feedback',
    'app.feedback.addFeedback',
    'app.feedback.feedbackDetail',
    'app.login',
    'app.profile',
    'app.signup',
    'app.loading',
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

    .controller('AppCtrl', function ($scope, $location, AuthService, Session, $log, $rootScope, AUTH_EVENTS, loading) {

        // Detect browser, abstracted from http://stackoverflow.com/questions/5916900/detect-version-of-browser
        var sayswho = (function () {
            var ua = navigator.userAgent, tem,
                M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE ' + (tem[1] || '');
            }
            if (M[1] === 'Chrome') {
                tem = ua.match(/\bOPR\/(\d+)/);
                if (tem != null) {
                    return 'Opera ' + tem[1];
                }
            }
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
            if ((tem = ua.match(/version\/(\d+)/i)) != null) {
                M.splice(1, 1, tem[1]);
            }
            try {
                if (M.length > 1) {
                    M[1] = parseInt(M[1], 10);
                }
                return M;
            }
            catch (err) {  // Assume browser isn't playing ball.
                return null;
            }
        })();

        var supportedBrowsers = {
            Firefox: 30,
            Chrome: 36
        };

        if (typeof(sayswho) == 'string') {
            $rootScope.browserName = sayswho;
        }
        else {
            $rootScope.browserName = sayswho.length ? sayswho[0] : null;
            $rootScope.browserVersion = sayswho.length > 1 ? sayswho[1] : null;
        }

        if ($rootScope.browserVersion) {
            $rootScope.browserSupported = sayswho && supportedBrowsers[$rootScope.browserName] <= sayswho[1];
        }
        else {
            $rootScope.browserSupported = false;
        }

        $rootScope.supportedBrowsers = supportedBrowsers;

        $log.info('Browser detected: ', sayswho);

        $rootScope.errors = [];
        $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams, $state) {
            if (angular.isDefined(toState.data.pageTitle)) {
                $scope.pageTitle = toState.data.pageTitle + ' | app';
            }
        });
        $scope.currentUser = null;
        AuthService.verify(function (err) {

        });
        $rootScope.$on(AUTH_EVENTS.loginSuccess, function () {
            $scope.currentUser = Session.getUser();
        });
        var clearUser = function () {
            $scope.currentUser = null;
        };
        $rootScope.$on(AUTH_EVENTS.loginFailed, clearUser);
        $rootScope.$on(AUTH_EVENTS.sessionTimeout, clearUser);
        $rootScope.$on(AUTH_EVENTS.logoutSuccess, clearUser);
        $rootScope.$on(AUTH_EVENTS.notAuthenticated, clearUser);

        $rootScope.clearError = function (index) {
            $rootScope.errors.splice(index);
        };

        $scope.logout = function () {
            AuthService.logout(function (err) {
                if (!err) {
                    $state.go('login');
                }
                else {
                    // TODO: Inject the error somewhere.
                }
            });
        };

    });

