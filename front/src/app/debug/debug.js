angular.module('app.debug', [
    'ui.router'
])

    .config(function config($stateProvider) {
        $stateProvider.state('debug', {
            url: '/debug',
            views: {
                "main": {
                    controller: 'DebugCtrl',
                    templateUrl: 'debug/debug.tpl.html'
                }
            },
            data: { pageTitle: 'Debug' }
        });
    })

    .controller('DebugCtrl', function DebugController($scope, $log) {



    })

;
