angular.module('app.asana.data', ['app.asana.restangular', 'restangular', 'pouch', 'LocalStorageModule'])






/**
 * Mediates between local storage of Asana data and remote.
 */
    .factory('AsanaData', function (AsanaLocal, AsanaRemote, $q, $log) {
        return {
            getUser: function () {
                var deferred = $q.defer();
                AsanaLocal.getUser().then(function (user) {
                    if (user) {
                        deferred.resolve(user);
                    }
                    else {
                        AsanaRemote.getUser().then(function (user) {
                            AsanaLocal.setActiveUser(user).then(function () {
                                deferred.resolve(user);
                            }, deferred.reject);
                        }, deferred.reject);
                    }
                });
                return deferred.promise;
            },
            clearActiveUser: AsanaLocal.clearActiveUser,
            getTasks: function (workspaceId) {
                var deferred = $q.defer();
                AsanaLocal.getTasks(workspaceId).then(function (tasks) {
                    if (tasks.length) {
                        $log.debug('have local tasks');
                        deferred.resolve(tasks);
                    }
                    else {
                        $log.debug('no local tasks');
                        AsanaRemote.getTasks(workspaceId).then(function (tasks) {
                            AsanaLocal.addTasks(tasks).then(function () {
                                deferred.resolve(tasks);
                            }, deferred.reject);
                        }, deferred.reject);
                    }
                }, deferred.reject);
                return deferred.promise;
            },
            reset: function () {
                var deferred = $q.defer();
                AsanaLocal.clearTasks().then(function () {
                    AsanaLocal.clearActiveUser();
                    deferred.resolve();
                }, deferred.reject);
                return deferred.promise;
            }
        };
    })

;