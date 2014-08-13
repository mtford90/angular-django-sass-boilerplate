angular.module('app.tasks', [
    'ui.router',
    'app',
    'app.logging',
    'ui.bootstrap'
])

    .config(function config($stateProvider) {
        $stateProvider.state('tasks', {
            url: '/tasks',
            views: {
                "main": {
                    controller: 'TasksCtrl',
                    templateUrl: 'tasks/tasks.tpl.html'
                }
            },
            data: { pageTitle: 'Tasks' }
        });
    })

    .factory('ActiveTasks', function ($q, jlog, $rootScope, lazyPouchDB) {
        var $log = jlog.loggerWithName('ActiveTasks');

        var service = {
            activateTask: _.partial(modifyTaskState, true),
            deactivateTask: _.partial(modifyTaskState, false),
            getActiveTasks: function (callback) {
//                callback = _.partial(callbackWrapper, callback);
                lazyPouchDB.getPromise().then(function (pouch) {
                    $log.debug('getActiveTasks: got pouch instance');
                    pouch.query('active_tasks').then(function (tasks) {
                        if (callback) {
                            var taskValues = _.pluck(tasks.rows, 'value');
                            $log.debug('getActiveTasks - got tasks:', taskValues);
                            callback(null, taskValues);
                        }
                    }, function (err) {
                        $log.error('getActiveTasks - problem querying', err);
                        if (callback) callback(err);
                    });
                }, function (err) {
                    if (callback) callback(err);
                });
            }
        };

        function callbackWrapper(callback, err, doc) {
            if (callback) {
                callback(err, doc);
            }
        }

        function configureActiveTasksScope() {
            $rootScope.activeTasks = {
                loadingActiveTasks: true,
                activeTasks: []
            };
        }

        if (!$rootScope.activeTasks) {
            configureActiveTasksScope();
            getActiveTasks();
        }

        function modifyTaskState(active, taskId, callback) {
//            callback = _.partial(callbackWrapper, callback);
            $log.debug('modifyTaskState');
            lazyPouchDB.getPromise().then(function (pouch) {
                // Keep trying to change the document until all conflicts have resolved.
                var work = function () {
                    if (active) $log.debug('modifyTaskState: attempting to activate task with id ' + taskId.toString());
                    else $log.debug('modifyTaskState: attempting to deactivate task with id ' + taskId.toString());
                    pouch.get(taskId).then(function (doc) {
                        doc.active = active;
                        pouch.put(doc, function (err, response) {
                            if (err) {
                                if (err.status == 409) {
                                    work();
                                }
                                else {
                                    callback(err);
                                }
                            }
                            else {
                                doc._id = response.id;
                                doc._rev = response.rev;
                                if (active) {
                                    var activeTasks = $rootScope.activeTasks.activeTasks;
                                    $log.debug('activeTasks', activeTasks);
                                    $rootScope.$apply(function () {
                                        activeTasks.push(doc);
                                    });
                                }
                                callback(null, doc);
                            }

                        });
                    }, callback);
                };
                work();
            }, callback);

        }

        function getActiveTasks() {
            $rootScope.activeTasks.loadingActiveTasks = true;
            service.getActiveTasks(function (err, tasks) {
                $rootScope.activeTasks.loadingActiveTasks = false;
                if (!err) {
                    $log.debug('got active tasks', tasks);
                    $rootScope.$apply(function () {
                        $rootScope.activeTasks.activeTasks = tasks;
                    });
                }
                else {
                    $log.error('error getting active tasks:', err);
                }
            })
        }

        return service;

    })

    .controller('TasksCtrl', function TasksController($scope, $rootScope, AsanaData, Settings, jlog, ActiveTasks) {

        var $log = jlog.loggerWithName('TasksCtrl');

        var $parentScope = $scope.$parent;

        function configureScope(loading) {
            loading = loading === undefined ? true : loading;
            $parentScope.tasks = {
                error: null,
                workspaces: null,
                loading: loading,
                selectedWorkspace: null,
                tasks: [],
                loadingTasks: loading
            };
        }

        $scope.asanaIsEnabled = function () {
            if ($rootScope.settings.asanaApiKey) {
                return $rootScope.settings.asanaApiKey.trim().length > 0;
            }
            return false;
        };

        function disableAsana() {
            configureScope(false);
            $parentScope.tasks.error = 'No API key present';
        }

        function getWorkspaces() {
            $log.debug('getWorkspaces');
            $parentScope.tasks.loading = true;
            if ($scope.asanaIsEnabled()) {
                $log.debug('Asana is enabled');
                AsanaData.getUser(function (err, user) {
                    configureScope();
                    if (err) {
                        $parentScope.tasks.loading = false;
                        $parentScope.tasks.error = err;
                    }
                    else {
                        $log.info('got user', user);
                        var workspaces = user.workspaces;
                        $log.info('got workspaces:', workspaces);
                        $parentScope.tasks.loading = false;
                        $parentScope.tasks.workspaces = workspaces;
                        $parentScope.tasks.selectedWorkspace = workspaces.length ? workspaces[0] : null;
                    }
                });
            }
            else {
                disableAsana();
            }
        }

        function getAsanaTasks(workspace) {
            $parentScope.tasks.loadingTasks = true;
            $parentScope.tasks.tasks = [];
            var id;
            if (workspace.id) {
                id = workspace.id;
            }
            else {
                id = workspace;
            }
            AsanaData.getTasks(id, function (err, tasks) {
                if (err) {
                    $log.warn('unable to get tasks:', err);
                }
                else {
                    $log.info('got tasks:', tasks);
                    $parentScope.tasks.tasks = tasks;
                }
                $parentScope.tasks.loadingTasks = false;
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
            $parentScope.$watch('tasks.selectedWorkspace', function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (newValue) {
                        $log.debug('getting tasks');
                        getAsanaTasks(newValue);
                    }
                }
            });
        }


        if (!$parentScope.tasks) {
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

        $scope.activateTask = function (task) {
            ActiveTasks.activateTask(task._id, function (err, task) {
                if (err) {
                    $log.error('error activating task:', err);
                }
            });
            var asanaTasks = $parentScope.tasks.tasks;
            var index = asanaTasks.indexOf(task);
            asanaTasks.splice(index, 1);
        };

        $scope.deactivateTask = function (task) {
            ActiveTasks.deactivateTask(task._id, function (err, task) {
                if (err) {
                    $log.error('error deactivating task:', err);
                }
            });
            var selectedWorkspaceId = $parentScope.tasks.selectedWorkspace ? $parentScope.tasks.selectedWorkspace.id : null;

            var activeTasks = $parentScope.activeTasks.activeTasks;
            $log.debug('activeTasks', activeTasks);
            var asanaTasks = $parentScope.tasks.tasks;
            var index = activeTasks.indexOf(task);
            activeTasks.splice(index, 1);
            if (task.workspaceId == selectedWorkspaceId) {
                asanaTasks.push(task);
            }

        };


    })

;
