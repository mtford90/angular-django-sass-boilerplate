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

    .controller('DebugCtrl', function DebugController($scope, $log, lazyPouchDB) {

        $scope.error = null;

        (function getNumDocuments() {
            var map = function (doc) {
                emit(doc);
            };

            var callback = function (err, response) {
                if (!err) {
                    $log.debug(response);

                    $scope.$apply(function () {
                        $scope.numDocuments = response.total_rows;
                    });
                }
                else {
                    $scope.error = err;
                }
            };
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.query(map, '_count', callback);
            });
        })();



    })

;
