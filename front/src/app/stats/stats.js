angular.module('app.stats', [
])

    .config(function config($stateProvider) {
        $stateProvider.state('stats', {
            url: '/stats',
            views: {
                "main": {
                    controller: 'StatsCtrl',
                    templateUrl: 'stats/stats.tpl.html'
                }
            },
            data: { pageTitle: 'Stats' }
        });
    })

    .controller('StatsCtrl', function StatsCtrl($scope) {


    })

;
