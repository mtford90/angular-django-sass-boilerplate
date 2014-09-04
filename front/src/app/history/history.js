angular.module('app.history', [
    'ui.router',
    'app',
    'ui.bootstrap'
])

    .config(function config($stateProvider) {
        $stateProvider.state('history', {
            url: '/history',
            views: {
                "main": {
                    controller: 'HistoryCtrl',
                    templateUrl: 'history/history.tpl.html'
                }
            },
            data: { pageTitle: 'History' }
        });
    })

    .controller('HistoryCtrl', function HistoryController($scope, $log) {



    })

;
