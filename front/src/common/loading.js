angular.module('app.loading', [])

    .factory('loading', function ($rootScope) {

        $rootScope.loading = false;



        var service = {
            on: function () {
                $rootScope.loading = true;
            },
            off: function () {
                $rootScope.loading = false;
            }
        };

        $rootScope.$on('$stateChangeStart', function () {
            service.off();
        });

        return service;
    });