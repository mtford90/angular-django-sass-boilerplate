angular.module('app.asana.data')



    // A set of stored procedures, mirroring AsanaDataAccess but hitting the local PouchDB instance
    // instead.
    .factory('AsanaLocal', function ($q, $log, lazyPouchDB) {

        function getUser() {
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
                    }
                    else {
                        def.resolve();
                    }
                }, def.reject);
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

        function getTasks() {
            var deferred = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.query('asana_tasks_index').then(function (res) {
                    pouch.query('asana_tasks_index').then(function (res) {
                        $log.debug('asana_tasks_index:', res);
                        var processed = processRows(res.rows);
                        $log.debug('processed tasks:', processed);
                        deferred.resolve(processed);
                    });
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

        function setActiveUser(user) {
            var setActiveUserDeferred = $q.defer();
            clearActiveUser().then(function () {
                user.type = 'user';
                user.source = 'asana';
                user.active = true;
                $log.debug('setting active user:', user);
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.post(user, function (err, resp) {
                        if (err) {
                            setActiveUserDeferred.reject(err);
                        }
                        else {
                            user._id = resp.id;
                            user._rev = resp.rev;
                            setActiveUserDeferred.resolve(user);
                        }
                    });
                });
            }, setActiveUserDeferred.reject);
            return setActiveUserDeferred.promise;
        }

        function addTask(task) {
            task.type = 'task';
            task.source = 'asana';
            var deferred = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                pouch.post(task, function (err, resp) {
                    if (err) {
                        deferred.reject(err);
                    }
                    else {
                        task._id = resp.id;
                        task._rev = resp.rev;
                        deferred.resolve(task);
                    }
                });
            }, deferred.reject);
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

        function addTasks(tasks) {
            var deferred = $q.defer();
            lazyPouchDB.getPromise().then(function (pouch) {
                _.each(tasks, function (task) {
                    task.source = 'asana';
                    task.type = 'task';
                });
                pouch.bulkDocs(tasks, function (err, responses) {
                    if (err) {
                        deferred.reject(err);
                    }
                    var failedResponses = [];
                    var succeededTasks = [];
                    for (var idx = 0; idx < responses.length; idx++) {
                        var response = responses[idx];
                        if (response.ok) {
                            var task = tasks[idx];
                            task._id = response.id;
                            task._rev = response.rev;
                            succeededTasks.push(task);
                        }
                        else {
                            failedResponses.push(response);
                        }
                    }
                    if (failedResponses.length) {
                        deferred.reject(failedResponses);
                    }
                    else {
                        deferred.resolve(succeededTasks);
                    }
                });
            });
            return deferred.promise;
        }

        return {
            getUser: getUser,
            getTasks: getTasks,
            clearActiveUser: clearActiveUser,
            setActiveUser: setActiveUser,
            addTask: addTask,
            clearTasks: clearTasks,
            removeTask: removeTask,
            addTasks: addTasks
        };
    })
;