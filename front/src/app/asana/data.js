angular.module('app.asana.data', [
    'app.asana.restangular',
    'restangular',
    'pouch',
    'LocalStorageModule',
    'app.logging',
    'app.settings'
])

/**
 * Mediates between local storage of Asana data and remote.
 */
    .factory('AsanaData', function (AsanaLocal, AsanaRemote, $q, jlog, $rootScope, Settings) {

        var $log = jlog.loggerWithName('AsanaData');

        /**
         * Clear out all tasks from local storage.
         * @returns promise
         */
        function reset() {
            var deferred = $q.defer();
            AsanaLocal.clearTasks().then(function () {
                AsanaLocal.clearActiveUser();
                deferred.resolve();
            }, deferred.reject);
            return deferred.promise;
        }


        /**
         * Grab all tasks from local if available, otherwise fetch from asana API.
         * @param workspaceId
         * @param callback
         * @returns promise
         */
        function getTasks(workspaceId, callback) {
            var deferred = $q.defer();
            AsanaLocal.getTasks(workspaceId, false).then(function (tasks) {
                if (tasks.length) {
                    $log.debug('have local tasks');
                    deferred.resolve(tasks);
                    if (callback) callback(null, tasks);
                }
                else {
                    $log.debug('no local tasks so getting remote tasks');
                    AsanaRemote.getTasks(workspaceId).then(function (tasks) {
                        $log.debug('AsanaRemote.getTasks returned:', tasks);
                        // dbTasks will have _id and _rev from PouchDB
                        if (tasks.length) {
                            $log.debug('Persisting tasks');
                            _.each(tasks, function (task) {
                                task.workspaceId = workspaceId;
                            });
                            AsanaLocal.addTasks(tasks).then(function (dbTasks) {
                                $log.debug('Tasks persisted', dbTasks);
                                if (callback) callback(null, dbTasks);
                                deferred.resolve(dbTasks);
                            }, function (err) {
                                if (callback) callback(err);
                                deferred.reject(err);
                            });
                        }
                        else {
                            $log.debug('No tasks, so returning immediately.');
                            if (callback) callback(null, tasks);
                            deferred.resolve(tasks);
                        }
                    }, function (err) {
                        if (callback) callback(err);
                    });
                }
            }, deferred.reject);
            return deferred.promise;
        }

        /**
         * Get current user from local storage if available, otehrwise fetch from Asana API.
         * @param callback
         * @returns promise
         */
        function getUser(callback) {
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
        }

        /**
         * Returns true if an API key is present, valid or not.
         * @returns {boolean}
         */
        function asanaIsEnabled() {
            if ($rootScope.settings.asanaApiKey) {
                return $rootScope.settings.asanaApiKey.trim().length > 0;
            }
            return false;
        }

        /**
         * Inject initial state of asana into rootScope
         * @param loading
         */
        function configureScope(loading) {
            loading = loading === undefined ? true : loading;
            $rootScope.tasks = {
                error: null,
                workspaces: null,
                loading: loading,
                selectedWorkspace: null,
                tasks: [],
                loadingTasks: loading
            };
        }

        /**
         * Clear asana data in rootScope.
         */
        function disableAsana() {
            configureScope(false);
            $rootScope.tasks.error = 'No API key present';
        }

        function getWorkspaces() {
            $log.debug('getWorkspaces');
            $rootScope.tasks.loading = true;
            if (asanaIsEnabled()) {
                $log.debug('Asana is enabled');
                getUser(function (err, user) {
                    configureScope();
                    if (err) {
                        $rootScope.tasks.loading = false;
                        $rootScope.tasks.error = err;
                    }
                    else {
                        $log.info('got user', user);
                        var workspaces = user.workspaces;
                        $log.info('got workspaces:', workspaces);
                        $rootScope.tasks.loading = false;
                        $rootScope.tasks.workspaces = workspaces;
                        $rootScope.tasks.selectedWorkspace = workspaces.length ? workspaces[0] : null;
                    }
                });
            }
            else {
                disableAsana();
            }
        }

        function getAsanaTasks(workspace) {
            $rootScope.tasks.loadingTasks = true;
            $rootScope.tasks.tasks = [];
            var id;
            if (workspace.id) {
                id = workspace.id;
            }
            else {
                id = workspace;
            }
            getTasks(id, function (err, tasks) {
                $log.debug('AsanaData.getTasks returned', tasks);
                if (err) {
                    $log.warn('unable to get tasks:', err);
                }
                else {
                    $log.info('got tasks:', tasks);
                    $rootScope.tasks.tasks = tasks;
                }
                $rootScope.tasks.loadingTasks = false;
            });
        }

        function watch() {
            $rootScope.$watch('settings.asanaApiKey', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue.trim().length) {
                        getWorkspaces();
                    }
                }
            });
            $rootScope.$watch('tasks.selectedWorkspace', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue) {
                        $log.debug('getting tasks');
                        getAsanaTasks(newValue);
                    }
                }
            });
        }

        if (!$rootScope.tasks) {
            $log.debug('initialising tasks for first time');
            configureScope();
            Settings.getAll(function (err, settings) {
                if (err) {
                    $log.error('error getting settings:', err);
                    // TODO: Handle fatal error.
                }
                else {
                    $log.debug('got settings:', settings);
                    if (settings.asanaApiKey) {
                        if (settings.asanaApiKey.trim().length) {
                            getWorkspaces();
                        }
                    }
                    else {
                        disableAsana();
                    }
                    watch();
                }
            });
        }
        else {
            $log.debug('tasks already initialised');
            watch();
        }


        return {
            reset: reset,
            getTasks: getTasks,
            clearActiveUser: AsanaLocal.clearActiveUser,
            getUser: getUser,
            completeTask: function (task, callback) {

                var tasks = $rootScope.tasks.tasks;
                var index = tasks.indexOf(task);
                if (index > -1) {
                    tasks.splice(index, 1);

                    var localError;
                    var remoteError;

                    /**
                     * Check for both remote & local completion, failed or otherwise.
                     */
                    function finalise() {
                        var localFinished = localError || localError === null;
                        var remoteFinished = remoteError || remoteError === null;
                        if (localFinished && remoteFinished) {
                            if (localError || remoteError) {
                                if (callback) callback({
                                    localError: localError,
                                    remoteError: remoteError
                                });
                            }
                            else {
                                task.completed = true;
                                if (callback) callback(null, task);
                            }
                        }
                    }

                    AsanaLocal.completeTask(task, function (err, resp) {
                        localError = err;
                        if (!localError) {
                            localError = null;
                            task._id = resp.id;
                            task._rev = resp.rev;
                        }
                        finalise();
                    });

                    AsanaRemote.completeTask(task, function (err) {
                        remoteError = err;
                        if (!remoteError) {
                            remoteError = null;
                        }
                        finalise();
                    });

                }
                else {
                    $log.error('Task doesnt exist', task);
                    if (callback) callback('Task doesnt exist');
                }

            },
            refreshWorkspace: function (workspaceId, callback) {
                if (!$rootScope.tasks.refreshing) {
                    $log.debug('refreshWorkspace');
                    $rootScope.tasks.refreshing = true;
                    AsanaRemote.getTasks(workspaceId, function (err, tasks) {
                        var numFinished = 0;
                        _.each(tasks, function (task) {
                            AsanaLocal.updateTask(task, function () {
                                numFinished++;
                            });
                        });
                        $log.debug('refreshWorkspace, got tasks', tasks);
                        $rootScope.tasks.refreshing = false;

                    });

                }
            }
        };
    })

;