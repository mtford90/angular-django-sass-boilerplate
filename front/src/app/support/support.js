angular.module('app.support', [
    'ui.router',
    'app',
    'ui.bootstrap'
])

    .config(function config($stateProvider) {
        $stateProvider.state('support', {
            url: '/support',
            views: {
                "main": {
                    controller: 'SupportCtrl',
                    templateUrl: 'support/support.tpl.html'
                }
            },
            data: { pageTitle: 'Support' }
        });
    })

    .controller('SupportCtrl', function SupportController($scope, $log) {



    })

;
