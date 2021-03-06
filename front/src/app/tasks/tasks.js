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
                    pouch.query('active_uncompleted_tasks').then(function (tasks) {
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

        function configureActiveTasksScope() {
            $rootScope.activeTasks = {
                loadingActiveTasks: true,
                activeTasks: []
            };
        }

        if (!$rootScope.activeTasks) {
            configureActiveTasksScope();
            getActiveTasks(function (err) {
                if (!err) {
                    $log.debug('watching active tasks so can write positions to local storage');
                    $rootScope.$watchCollection('activeTasks.activeTasks', function (newValue, oldValue) {
                        for (var idx = 0; idx < newValue.length; idx++) {
                            var task = newValue[idx];
                            $log.debug('Writing position for task', idx, task);
                            lazyPouchDB.setEventually(task, 'position', idx, function (err, task) {
                                if (err) {
                                    $log.error('Unable to write position', err);
                                }
                                else {
                                    $log.debug('Wrote position for task', task);
                                }
                            });
                        }
                    });
                }
                else {
                    $log.error('error getting active tasks:', err);
                }
            });
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

        function getActiveTasks(callback) {
            $rootScope.activeTasks.loadingActiveTasks = true;
            service.getActiveTasks(function (err, tasks) {
                $rootScope.activeTasks.loadingActiveTasks = false;
                if (!err) {
                    $log.debug('got active tasks', tasks);
                    $rootScope.$apply(function () {
                        $rootScope.activeTasks.activeTasks = _.sortBy(tasks, function (doc) { return doc.position; });
                        if (callback) callback(null, $rootScope.activeTasks.activeTasks);
                    });
                }
                else {
                    if (callback) callback(err);
                    $log.error('error getting active tasks:', err);
                }
            });

        }

        return service;

    })

    .controller('TasksCtrl', function TasksController($scope, $rootScope, AsanaData, Settings, jlog, ActiveTasks) {

        var $log = jlog.loggerWithName('TasksCtrl');

        $scope.activateTask = function (task) {
            ActiveTasks.activateTask(task._id, function (err, task) {
                if (err) {
                    $log.error('error activating task:', err);
                }
            });
            var asanaTasks = $scope.tasks.tasks;
            var index = asanaTasks.indexOf(task);
            asanaTasks.splice(index, 1);
        };

        $scope.completeTask = AsanaData.completeTask;

        $scope.refresh = AsanaData.refreshWorkspace;

        $scope.deactivateTask = function (task) {
            ActiveTasks.deactivateTask(task._id, function (err, task) {
                if (err) {
                    $log.error('error deactivating task:', err);
                }
            });
            var selectedWorkspaceId = $scope.tasks.selectedWorkspace ? $scope.tasks.selectedWorkspace.id : null;

            var activeTasks = $scope.activeTasks.activeTasks;
            $log.debug('activeTasks', activeTasks);
            var asanaTasks = $scope.tasks.tasks;
            var index = activeTasks.indexOf(task);
            activeTasks.splice(index, 1);
            if (task.workspaceId == selectedWorkspaceId) {
                asanaTasks.push(task);
            }

        };

        $scope.sortableOptions = {
            axis: 'y',
            stop: function (e, ui) {
                $log.debug('stop:', $scope.activeTasks.activeTasks, e);
            }
        };


    })

;
