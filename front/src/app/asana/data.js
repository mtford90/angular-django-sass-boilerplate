angular.module('app.asana.data', ['app.asana.restangular', 'restangular'])

/**
 * Error handlers for the services with which we interact when pulling data from Asana
 * and storing it locally.
 */
    .factory('HandleError', function (ASANA_ERRORS) {

        /**
         * Handle errors from Asana by interpreting the error object and returning a human readable error
         * to the promise.
         *
         * @param deferred The promise which will receive the result of the error handling
         * @param err An error from Asana
         */
        function handleAsanaErrors(deferred, err) {
            var humanReadableError = 'Unknown Error';
            if (err.reason) {
                // If no API key is present it's not an error. The user has likely deleted the API key
                // and hence we simply return nothing.
                if (err.code == ASANA_ERRORS.NO_API_KEY) {
                    deferred.resolve();
                }
                else {
                    humanReadableError = err.reason;
                }
            }
            else if (err.status == 401) {
                humanReadableError = 'Invalid API Key';
            }
            else if (err.data) {
                if (err.errors) {
                    if (err.data.errors.length) {
                        humanReadableError = err.data.errors[0];
                    }
                    else {
                        humanReadableError = 'Unknown Error';
                    }
                }
                else {
                    humanReadableError = 'Unknown Error';
                }
            }
            else {
                humanReadableError = 'Unknown Error: HTTP ' + err.status;
            }
            deferred.reject(humanReadableError);
        }

        /**
         * Handle errors from PouchDB by interpreting the error object and returning a human readable error
         * to the promise.
         *
         * @param deferred The promise which will receive the result of the error handling
         * @param err An error from PouchDB
         */
        function handlePouchErrors(deferred, err) {
            var message = err.message;
            if (message) {
                deferred.reject('Database error: ' + message + ' (' + err.status + ')');
            }
            else {
                deferred.reject('Database error: Unknown');
            }
        }

        return {
            asana: handleAsanaErrors,
            pouch: handlePouchErrors
        };
    })

/**
 * Functions that 'derectangularize' objects, converting them into JSON-compatible objects that can then be
 * stored in PouchDB.
 */
    .factory('DeRectangularize', function () {
        /**
         * Given rectangularized tags, produce an array of JSON-compatible objects that can be stored
         * in PouchDB.
         * @param tags The list of rectangularized tags.
         * @returns {Array} An array of JSON-compatible objects that can be stored in PouchDB
         */
        function deRectangularizeTags(tags) {
            var processedTags = [];
            for (var i = 0; i < tags.length; i++) {
                var tag = tags[i];
                processedTags.push({
                    name: tag.name,
                    id: tag.id
                });
            }
            return processedTags;
        }

        /**
         * Given a rectangularized user, returns a JSON-compatible object that can be stored in PouchDB
         * @param user
         * @returns {{name: *, photo: *, id: (user.id|*), workspaces: (*|$rootScope.asana.workspaces), type: string}}
         */
        function deRectangularizeUser(user) {
            return {
                name: user.name,
                photo: user.photo.image_128x128,
                id: user.id,
                workspaces: user.workspaces,
                type: 'user'
            };
        }


        function deRectangularizeTask(task) {
            var processedTags = deRectangularizeTags(task.tags);
            return {
                name: task.name,
                id: task.id,
                tags: processedTags
            };
        }

        return {
            User: deRectangularizeUser,
            Task: deRectangularizeTask
        };
    })

/**
 * Functions that validate objects returned from the Asana API.
 */
    .factory('Validate', function () {
        /**
         * These are fields that we expect returned from the Asana API for each type. We return an error
         * if not received as they are crucial to app functionality.
         */
        var requiredFields = {
            User: ['workspaces', 'name', 'id']
        };


        /**
         * @param user
         * @returns {*} An error message if invalid, otherwise null
         */
        function validateRectangularizedUser(user) {
            var requiredUserFields = requiredFields.User;
            for (var i = 0; i < requiredUserFields.length; i++) {
                var field = requiredUserFields[i];
                if (user[field] === undefined) {
                    return 'Missing field ' + field + ' from Asana response for users';
                }
            }
            return null;
        }

        return {
            User: validateRectangularizedUser
        };
    })


    // A set of stored procedures that hit the remote Asana API.
    .factory('AsanaDataAccess', function ($q, $log, HandleError, Validate, DeRectangularize, AsanaRestangular) {

        function getUser() {
            var deferred = $q.defer();
            AsanaRestangular.one('users', 'me').get().then(function success(user) {
                var err = Validate.User(user);
                if (err) {
                    deferred.reject(err);
                }
                var processedUser = DeRectangularize.User(user);
                deferred.resolve(processedUser);
            }, _.partial(HandleError.asana, deferred));
            return deferred.promise;
        }

        /**
         * Given an array of tasks, populate the tags for all.
         * @param tasks An array of rectangularized tags
         */
        function getTags(tasks) {
            var deferred = $q.defer();
            var numProcessed = 0;
            var onGetTaskSuccess = function success(task, tags) {
                $log.debug('Got tags', tags);
                task.tags = tags;
                numProcessed++;
                // Only resolved if all requests to obtain tags are successful.
                if (numProcessed === tasks.length) {
                    deferred.resolve(tasks);
                }
            };
            for (var i = 0; i < tasks.length; i++) {
                var task = tasks[i];
                var dent = task.id;
                $log.debug('Getting tags for task' + dent);
                task.isLoadingTags = true;
                var boundOnSuccess = _.partial(onGetTaskSuccess, task);
                AsanaRestangular.one('tasks', dent).getList('tags').then(boundOnSuccess, deferred.reject);
            }
            return deferred.promise;
        }

        /**
         * Given an array of rectangularized tasks, download the tags from Asana and then derectangularize everything
         * @param tasks
         * @returns a promise
         */
        function processTasks(tasks) {
            var deferred = $q.defer();
            getTags(tasks).then(function (tasks) {
                var processedTasks = [];
                for (var i = 0; i < tasks.length; i++) {
                    var task = tasks[i];
                    var processedTask = DeRectangularize.Task(task);
                    processedTasks.push(processedTask);
                }
                deferred.resolve(processedTasks);
            }, deferred.reject);
            return deferred.promise;
        }

        /**
         * Returns a derectangularized list of tasks assigned to the user in the workspace
         * with workspaceId
         * @param workspaceId
         * @returns promise
         */
        function getTasks(workspaceId) {
            var deferred = $q.defer();
            var queryParams = {
                assignee: 'me', // Only return tasks assigned to the user.
                workspace: workspaceId,
                completed_since: 'now'
            };
            var asanaErrorHandler = _.partial(HandleError.asana, deferred);
            AsanaRestangular.all('tasks').getList(queryParams).then(function success(tasks) {
                if (tasks.length) {
                    processTasks(tasks).then(deferred.resolve, asanaErrorHandler);
                }
                else {
                    deferred.resolve([]);
                }
            }, asanaErrorHandler);
            return deferred.promise;
        }

        return {
            getUser: getUser,
            getTasks: getTasks
        };
    })

    // A service that defers the return of the pouchdb instance so that it has time to
    // initialise/load..
    .factory('lazyPouchDB', function ($q, $log) {
        var pouch = null;
        var deferred = $q.defer();

        function installIndex(index, name) {
            $log.debug('installing index:', index, name);
            var deferred = $q.defer();
            pouch.put(index).then(function () {
                // Kick off initial update.
                $log.debug('Kicking off initial update for index ' + name);
                pouch.query(name, {stale: 'update_after'}).then(deferred.resolve, deferred.reject);
            }, function (err) {
                if (err.status == 409) { // Already exists.
                    $log.debug('index ' + name + ' already exists, therefore ignoring');
                    deferred.resolve();
                }
                else {
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        }

        function installActiveUserIndex() {
            return installIndex({
                _id: '_design/active_user_index',
                views: {
                    'active_user_index': {
                        map: function (doc) {
                            if (doc.type == 'user' && doc.active) {
                                emit(doc._id, doc);
                            }
                        }.toString()
                    }
                }
            }, 'active_user_index');
        }

        function initialisePouchDB() {
            // TODO: Setup design documents.
            $log.debug('Initialising PouchDB');
            installActiveUserIndex().then(function () {
                deferred.resolve(pouch);
            }, deferred.reject);
        }

        function configurePouchDB() {
            $log.debug('Configuring PouchDB');
            pouch = new PouchDB('db');
            var map = function (doc) {
                emit(doc);
            };
            pouch.query(map, '_count', function (err, response) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    if (!response.total_rows) {
                        initialisePouchDB(deferred);
                    }
                    else {
                        deferred.resolve(pouch);
                    }
                }
            });
        }

        configurePouchDB();

        return {
            promise: deferred.promise,
            /**
             * Inject pouchdb instance manually. Useful for testing.
             * @param _pouch a pouchdb instance
             */
            inject: function (_pouch) {
                pouch = _pouch;
            },
            /**
             * Destroy the existing pouchdb instance and start from scratch.
             * @returns promise
             */
            reset: function () {
                var resetDeferred = $q.defer();
                var reset = function () {
                    if (pouch) {
                        var dbInstance = pouch;
                        pouch = null;
                        deferred = $q.defer();
                        dbInstance.destroy(function (err) {
                            if (err) {
                                $log.error('Unable to destroy database:', err);
                                resetDeferred.reject(err);
                            }
                            else {
                                $log.debug('Successfully destroyed database');
                                configurePouchDB();
                                // Reset succeeds/fails if configuration succeeds/fails.
                                deferred.promise.then(resetDeferred.resolve, resetDeferred.reject);
                            }
                        });
                    }
                };
                // Ensure initialising has completed (successfully or otherwise) before we allow
                // a reset to take place.
                this.promise.then(reset, reset);
                return resetDeferred.promise;
            }
        };

    })

    // A set of stored procedures, mirroring AsanaDataAccess but hitting the local PouchDB instance
    // instead.
    .factory('AsanaDataAccessLocal', function ($q, $log, lazyPouchDB) {

        function getUser() {
            var deferred = $q.defer();
            lazyPouchDB.promise.then(function (pouch) {
                pouch.query('active_user_index').then(function (res) {
                    $log.debug('active_user_index:', res);
                    if (res.rows.length > 1) {
                        $log.warn('More than one active user?', res.rows);
                    }
                    if (res.rows.length) {
                        var userRow = res.rows[0];
                        $log.debug('Found an active user:', userRow);
                        deferred.resolve(userRow.value);
                    }
                    else {
                        $log.debug('Couldnt find a user');
                        deferred.resolve(null);
                    }
                }, deferred.reject);
            }, deferred.reject);
            return deferred.promise;
        }

        function getTasks() {

        }

        /**
         * This is a nice little workaround for the confusing revision identifiers
         * with pouchdb.
         * https://github.com/pouchdb/pouchdb/issues/1691 demonstrates the confusion nicely and contains
         * the function below that has been adapted to latest pouch versions.
         * @param doc
         * @returns promise
         */
        function retryUntilWritten(doc) {
            var deferred = $q.defer();
            lazyPouchDB.promise.then(function (db) {
                db.get(doc._id).then(function (origDoc) {
                    doc._rev = origDoc._rev;
                    return db.put(doc, doc._id).then(deferred.resolve, deferred.reject);
                }, function (err) {
                    var HTTP_CONFLICT = 409;
                    if (err.status === HTTP_CONFLICT) {
                        return retryUntilWritten(doc);
                    } else { // new doc
                        return db.put(doc, doc._id).then(deferred.resolve, deferred.reject);
                    }
                });
            }, deferred.reject);
            return deferred.promise;
        }

        function clearActiveUser() {
            var deferred = $q.defer();
            getUser().then(function (existingUser) {
                if (existingUser) {
                    existingUser.active = false;
                    if (!existingUser._id) {
                        existingUser._id = existingUser.id;
                    }
                    retryUntilWritten(existingUser).then(function (resp) {
                        $log.debug('Successfully cleared active user with response:', resp);
                        deferred.resolve(resp);
                    }, function (err) {
                        $log.debug('Failed to clear active user:', err);
                        deferred.reject(err);
                    });
                }
                else {
                    deferred.resolve();
                }
            }, function (err) {
                $log.error('Error clearing active user:', err);
                deferred.reject(err);
            });
            return deferred.promise;
        }

        function _setActiveUser(user) {
            user.type = 'user';
            user.active = true;
            var deferred = $q.defer();
            lazyPouchDB.promise.then(function (pouch) {
                pouch.put(user, user.id).then(function (resp) {
                    $log.debug('set active user successfully with resp:', resp);
                    user._rev = resp.rev;
                    deferred.resolve(resp);
                }, function (err) {
                    $log.error('Error creating active user:', err);
                    deferred.reject(err);
                });
            }, deferred.reject);
            return deferred.promise;
        }

        function setActiveUser(user) {
            var deferred = $q.defer();
            clearActiveUser().then(function () {
                _setActiveUser(user).then(
                    deferred.resolve, deferred.reject
                );
            }, deferred.reject);
            return deferred.promise;
        }

        return {
            getUser: getUser,
            getTasks: getTasks,
            clearActiveUser: clearActiveUser,
            setActiveUser: setActiveUser
        };
    })

;