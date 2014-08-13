angular.module('app.asana.data', ['app.asana.restangular', 'restangular', 'pouch', 'LocalStorageModule'])

/**
 * Mediates between local storage of Asana data and remote.
 */
    .factory('AsanaData', function (AsanaLocal, AsanaRemote, $q, jlog, $rootScope) {

        var $log = jlog.loggerWithName('AsanaData');




        return {
            getUser: function (callback) {
                var deferred = $q.defer();
                var handleError = function (err) {
                    if (callback)  callback(err);
                    deferred.reject(err);
                };
                AsanaRemote.getUser().then(function (user) {
                    user.asanaApiKey = $rootScope.asanaApiKey;
                    AsanaLocal.setActiveUser(user).then(function () {
                        deferred.resolve(user);
                        if (callback) callback(null, user);
                    }, handleError);
                }, handleError);
                return deferred.promise;
            },
            clearActiveUser: AsanaLocal.clearActiveUser,
            getTasks: function (workspaceId, callback) {
                var deferred = $q.defer();
                AsanaLocal.getTasks(workspaceId, false).then(function (tasks) {
                    if (tasks.length) {
                        $log.debug('have local tasks');
                        deferred.resolve(tasks);
                        if (callback) callback(null, tasks);
                    }
                    else {
                        AsanaRemote.getTasks(workspaceId).then(function (tasks) {
                            // dbTasks will have _id and _rev from PouchDB
                            _.each(tasks, function (task) {
                                task.workspaceId = workspaceId;
                            });
                            AsanaLocal.addTasks(tasks).then(function (dbTasks) {
                                deferred.resolve(dbTasks);
                                if (callback) callback(null, dbTasks);
                            }, function (err) {
                                if (callback) callback(err);
                            });
                        }, function (err) {
                            if (callback) callback(err);
                        });
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