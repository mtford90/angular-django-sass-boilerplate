angular.module('app.signup', [
    'ui.router'
])

    .config(function config($stateProvider) {
        $stateProvider.state('signup', {
            url: '/signup',
            views: {
                "main": {
                    controller: 'SignupCtrl',
                    templateUrl: 'signup/signup.tpl.html'
                }
            },
            data: { pageTitle: 'SignUp' }
        });
    })

/**
 * And of course we define a controller for our route.
 */
    .controller('SignupCtrl', function HomeController($scope, AuthService, $state, $log) {
        $scope.details = {
            username: '',
            email: '',
            password: ''
        };
        $scope.signUp = function () {
            AuthService.signUp({
                username: $scope.details.username,
                password: $scope.details.password,
                email: $scope.details.email
            }, function (err) {
                if (!err) {
                    $state.go('login');
                }
                else {
                    // TODO: Inject the error somewhere
                }
            });
        };
    })

;
