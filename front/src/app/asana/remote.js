angular.module('app.asana.data')

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


// A set of stored procedures that hit the remote Asana API.
    .factory('AsanaRemote', function ($q, $log, Validate, DeRectangularize, AsanaRestangular) {

        function getUser() {
            $log.debug('getUser');
            var deferred = $q.defer();
            AsanaRestangular.one('users', 'me').get().then(function success(user) {
                var err = Validate.User(user);
                if (err) {
                    deferred.reject(err);
                }
                else {
                    var processedUser = DeRectangularize.User(user);
                    deferred.resolve(processedUser);
                }
            }, function (err) {
                $log.error('Error getting user:', err);
                deferred.reject(err);
            });
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
            AsanaRestangular.all('tasks').getList(queryParams).then(function success(tasks) {
                if (tasks.length) {
                    $log.debug('Got tasks and now going to process them:', tasks);
                    processTasks(tasks).then(function (processedTasks) {
                        $log.debug('Successfully got tasks:', processedTasks);
                        deferred.resolve(processedTasks);
                    }, function (err) {
                        $log.debug('Error processing tasks:', err);
                        deferred.reject(err);
                    });
                }
                else {
                    deferred.resolve([]);
                }
            }, deferred.reject);
            return deferred.promise;
        }

        return {
            getUser: getUser,
            getTasks: getTasks
        };
    })

;