angular.module('app.settings', [
    'app.asana'
])

    .config(function config($stateProvider) {
        $stateProvider.state('settings', {
            url: '/settings',
            views: {
                "main": {
                    controller: 'SettingsCtrl',
                    templateUrl: 'settings/settings.tpl.html'
                }
            },
            data: { pageTitle: 'Settings' }
        });
    })

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, User) {

        $scope.apiKey = $rootScope.settings.apiKey;

        var previousApiKey = '';

        $scope.apiKeyChanged = function () {
            var apiKey = $scope.apiKey;
            if (apiKey != previousApiKey) {
                $log.debug('new api key:', apiKey);
                previousApiKey = apiKey;
                var user = User.get({}, function success() {
                     $log.debug('got user:', user);
                }, function error (err) {
                    $log.error('error getting user:', err);
                });
            }
        };
    })
;
