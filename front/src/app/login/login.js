angular.module('app.login', [
    'ui.router',
    'angularFileUpload'
])

    .config(function config($stateProvider) {
        $stateProvider.state('login', {
            url: '/login',
            views: {
                "main": {
                    controller: 'LoginCtrl',
                    templateUrl: 'login/login.tpl.html'
                }
            },
            data: { pageTitle: 'Login' }
        });
    })

    .controller('LoginCtrl', function ($scope, AuthService, $state, $log) {
        if (!$scope.currentUser) {
            $scope.details = {
                username: '',
                password: ''
            };
            $scope.error = null;
            $scope.login = function () {
                var username = $scope.details.username;
                var password = $scope.details.password;
                $log.debug('Logging in with:', username, password);
                AuthService.login(
                    username,
                    password, function (err) {
                        if (!err) {
                            $state.go('profile');
                        }
                        else {
                            $scope.error = err;
                        }
                    });
            };
        }
        else {
            $state.go('profile');
        }
    })

;
