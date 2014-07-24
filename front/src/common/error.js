angular.module('app')

    .factory('errors', function ($rootScope) {


        var service = {
            addServerError: function (msg) {
                $rootScope.errors.push({message: msg, typ: 'danger'});
            },
            addWarning: function (msg) {
                $rootScope.errors.push({message: msg, typ: 'warning'});
            },
            serverErrorFromResult: function (res) {
                var data = res.data;
                var status = res.status;
                if (data) {
                    if (data.detail) {
                        this.addServerError(data.detail);
                    }
                    else {
                        this.addServerError('Unknown server error.');
                    }
                }
                else {
                    this.addServerError(status);
                }
            },
            majorError: function (msg) {
                msg = msg ? msg.trim() : '';
                if (!msg.length) {
                    msg = "Something went very wrong and we've been informed about it. Sorry!";
                }
                $rootScope.majorError = {message: msg};
            },
            clearMajorError: function () {
                $rootScope.majorError = null;
            }
        };

        $rootScope.$on('$stateChangeStart', function () {
            service.clearMajorError();
        });

        return service;

    });