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
    .factory('AsanaRemote', function ($q, jlog, Validate, DeRectangularize, AsanaRestangular) {

        var $log = jlog.loggerWithName('AsanaRemote');

        function getUser(callback) {
            var deferred = $q.defer();
            $log.debug('getUser1');
            AsanaRestangular.one('users', 'me').get().then(function success(user) {
                $log.debug('getUser', user);
                var err = Validate.User(user);
                if (err) {
                    if (callback) callback(err);
                    deferred.reject(err);
                }
                else {
                    var processedUser = DeRectangularize.User(user);
                    if (callback) callback(null, processedUser);
                    deferred.resolve(processedUser);
                }
            }, function (err) {
                $log.error('Error getting user:', err);
                if (callback) callback(err);
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
         * @param wid
         */
        function processTasks(tasks) {
            var deferred = $q.defer();
            if (tasks.length) {
                getTags(tasks).then(function (tasks) {
                    var processedTasks = [];
                    for (var i = 0; i < tasks.length; i++) {
                        var task = tasks[i];
                        var processedTask = DeRectangularize.Task(task);
                        processedTasks.push(processedTask);
                    }
                    deferred.resolve(processedTasks);
                }, deferred.reject);
            }
            else {
                deferred.resolve(tasks);
            }
            return deferred.promise;
        }

        /**
         * Returns a derectangularized list of tasks assigned to the user in the workspace
         * with workspaceId
         * @param workspaceId
         * @returns promise
         */
        function getTasks(workspaceId, callback) {
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
                        if (callback) callback(null, processedTasks);
                        deferred.resolve(processedTasks);
                    }, function (err) {
                        $log.debug('Error processing tasks:', err);
                        if (callback) callback(err);
                        deferred.reject(err);
                    });
                }
                else {
                    if (callback) callback(null, []);
                    deferred.resolve([]);
                }
            }, function (err) {
                if (callback) callback(err);
                deferred.reject(err);
            });
            return deferred.promise;
        }

        function getProjects(callback) {
            AsanaRestangular.all('projects').getList().then(function success(projects) {
                callback(null, projects);
            }, callback);
        }

        function createTask(task, callback) {
            $log.debug('createTask', task);
            AsanaRestangular.all('tasks').post({data: task}).then(function (resp) {
                callback(null, DeRectangularize.Task(resp));
            }, function (err) {
                if (callback) callback(err);
            });
        }

        function deleteTask(task, callback) {
            AsanaRestangular.one('tasks', task.id).remove().then(function (resp) {
                callback(null, resp);
            }, callback);
        }

        function completeTask(task, callback) {
            var t = AsanaRestangular.all('tasks').one(task.id.toString());
            t.data = {completed: true};
            t.put().then(function () {
                callback(null);
            }, callback);
        }

        return {
            getUser: getUser,
            getProjects: getProjects,
            getTasks: getTasks,
            createTask: createTask,
            completeTask: completeTask,
            deleteTask: deleteTask
        };
    })

;