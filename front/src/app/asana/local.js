angular.module('app.asana.data')


    // A set of stored procedures, mirroring AsanaDataAccess but hitting the local PouchDB instance
    // instead.
    .factory('AsanaLocal', function ($q, $log, lazyPouchDB) {

        function getUser(callback) {
            var def = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.query('active_user_index', function (err, resp) {
                    if (resp.total_rows > 1) {
                        $log.warn('more than one active user:', resp);
                    }
                    if (resp.total_rows) {
                        var row = resp.rows[0];
                        var doc = row.value;
                        def.resolve(doc);
                        if (callback) callback(null, doc);
                    }
                    else {
                        def.resolve();
                        if (callback) callback(null);
                    }
                }, function (err) {
                    if (callback) callback(err);
                    def.reject(err);
                });
            });
            return def.promise;
        }

        /**
         * Given rows from PouchDB, pulls out the record values and returns as an
         * array
         * @param rows from PouchDB
         * @returns {Array}
         */
        function processRows(rows) {
            $log.debug('processRows:', rows);
            var processedRows = [];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                $log.debug('Processing row:', row);
                processedRows.push(row.value);
            }
            return processedRows;
        }

        function getTasks(workspaceId, includeActiveTasks) {
            includeActiveTasks = includeActiveTasks === undefined ? true : includeActiveTasks;
            var deferred = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                var index = includeActiveTasks ? 'asana_tasks_index_workspace' : 'asana_tasks_index_workspace_inactive_tasks';
                pouch.query(index, {key: workspaceId}).then(function (res) {
                    $log.debug('asana_tasks_index_workspace:', res);
                    var processed = processRows(res.rows);
                    $log.debug('processed tasks:', processed);
                    deferred.resolve(processed);
                });
            }, deferred.reject);
            return deferred.promise;
        }


        function clearActiveUser() {
            var def = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.query('active_user_index', function (err, resp) {
                    if (resp.total_rows > 1) {
                        $log.warn('more than one active user:', resp);
                    }
                    if (resp.total_rows) {
                        var row = resp.rows[0];
                        var doc = row.value;
                        doc._deleted = true;
                        lazyPouchDB.retryUntilWritten(doc).then(def.resolve, def.reject);
                    }
                    else {
                        def.resolve();
                    }
                }, def.reject);
            });
            return def.promise;
        }

        function setActiveUser(user, callback) {
            var setActiveUserDeferred = $q.defer();
            clearActiveUser().then(function () {
                user.type = 'user';
                user.source = 'asana';
                user.active = true;
                $log.debug('setting active user:', user);
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.post(user, function (err, resp) {
                        if (err) {
                            if (callback) callback(err);
                            setActiveUserDeferred.reject(err);
                        }
                        else {
                            user._id = resp.id;
                            user._rev = resp.rev;
                            if (callback) callback(null, user);
                            setActiveUserDeferred.resolve(user);
                        }
                    });
                });
            }, function (err) {
                if (callback ) callback(err);
                setActiveUserDeferred.reject(err);
            });
            return setActiveUserDeferred.promise;
        }

        function addTask(task, callback) {
            $log.debug('addTask', task);
            task.type = 'task';
            task.source = 'asana';
            var deferred = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.query('task_by_asana_id', {key: task.id}, function (err, resp) {
                    $log.debug('task_by_asana_id', resp);
                    if (err) {
                        if (callback) callback(err);
                        deferred.reject(err);
                    }
                    else {
                        if (resp.rows.length) {
                            err = 'task with asana id' + task.id.toString() + ' already exists';
                            if (callback) callback(err);
                            deferred.reject(err);
                        }
                        else {
                            pouch.post(task, function (err, resp) {
                                if (err) {
                                    if (callback) callback(err);
                                    deferred.reject(err);
                                }
                                else {
                                    task._id = resp.id;
                                    task._rev = resp.rev;
                                    if (callback) callback(null, task);
                                    deferred.resolve(task);
                                }
                            });
                        }
                    }

                });

            }, function (err) {
                if (callback) callback(err);
                deferred.reject(err);
            });
            return deferred.promise;
        }

        function removeTask(task) {
            task._deleted = true;
            return lazyPouchDB.retryUntilWritten(task);
        }

        /**
         * Delete all Asana tasks
         * @returns promise
         */
        function clearTasks() {
            var deferred = $q.defer();
            this.getTasks().then(function (tasks) {
                var numDeleted = 0;
                var onSuccess = function () {
                    numDeleted++;
                    $log.debug('numDeleted(' + numDeleted + ') == tasks.length(' + tasks.length + ')');
                    if (numDeleted == tasks.length) {
                        deferred.resolve();
                    }
                };
                var onFail = function (err) {
                    $log.error('Error clearing tasks:', err);
                    deferred.reject(err);
                };
                for (var i = 0; i < tasks.length; i++) {
                    var task = tasks[i];
                    removeTask(task).then(onSuccess, onFail);
                }
            }, function (err) {
                $log.error('Error clearing tasks:', err);
                deferred.reject(err);
            });
            return deferred.promise;
        }

        function addTasks(tasks, callback) {
            var deferred = $q.defer();
            var errors = [];
            var addTaskCallback = function (err) {
                if (err) {
                    errors.push(err);
                }
                numFinished++;
                if (numFinished == tasks.length) {
                    if (errors.length) {
                        if (callback) callback(errors);
                        deferred.reject(errors);
                    }
                    else {
                        if (callback) callback();
                        deferred.resolve(tasks);
                    }
                }
            };
            for (var i = 0; i < tasks.length; i++) {
                var task = tasks[i];
                var numFinished = 0;
                addTask(task, addTaskCallback);
            }
            return deferred.promise;
        }

        /**
         * Set key to value in PouchDB eventually, resolving conflicts.
         *
         * @param task either the identifier of a task or an object with _id & _rev
         * @param key the attribute we want to set
         * @param value the vlaue of the attribute
         * @param callback
         */
        function setEventually(task, key, value, callback) {
            lazyPouchDB.getPromise(function (err, pouch) {
                if (err) {
                    callback(err);
                }
                else {
                    function getAndThenPut(taskId) {
                        pouch.get(taskId, function (err, task) {
                            if (err) {
                                callback(err);
                            }
                            else {
                                task[key] = value;
                                put(task);
                            }
                        });
                    }
                    function put(task) {
                        pouch.put(task, function (err, resp) {
                            if (err) {
                                if (err.status === 409) {
                                    getAndThenPut(task._id);
                                }
                                else {
                                    callback(err);
                                }
                            }
                            else {
                                task._id = resp.id;
                                task._rev = resp.rev;
                                callback(null, task);
                            }
                        });
                    }
                }
                if (task._id) {
                    task[key] = value;
                    put(task);
                }
                else {
                    getAndThenPut(task);
                }
            });
        }

        return {
            getUser: getUser,
            getTasks: getTasks,
            clearActiveUser: clearActiveUser,
            setActiveUser: setActiveUser,
            addTask: addTask,
            clearTasks: clearTasks,
            removeTask: removeTask,
            addTasks: addTasks,
            completeTask: function (task, callback) {
                var value = true;
                var key = 'completed';
                setEventually(task, key, value, callback);
            }
        };
    })
;