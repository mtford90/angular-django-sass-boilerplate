angular.module('app.settings', [
    'app.asana',
    'LocalStorageModule',
    'dropdown',
    'ui.sortable'
])

    .config(function config($stateProvider) {
        $stateProvider.state('settings', {
            url: '/settings?tab',
            views: {
                "main": {
                    controller: 'SettingsCtrl',
                    templateUrl: 'settings/settings.tpl.html'
                }
            },
            data: { pageTitle: 'Settings' }
        });
    })

    .config(['localStorageServiceProvider', function (localStorageServiceProvider) {
        localStorageServiceProvider.setPrefix('pomodoro');
    }])

    .constant('SETTING_CHANGED_EVENT', 'SETTING_CHANGED_EVENT')
    .constant('SETTING_CHANGED_OLD_VALUE_KEY', 'SETTING_CHANGED_OLD_VALUE_KEY')
    .constant('SETTING_CHANGED_NEW_VALUE_KEY', 'SETTING_CHANGED_NEW_VALUE_KEY')
    .constant('SETTING_CHANGED_PROPERTY_KEY', 'SETTING_CHANGED_PROPERTY_KEY')

/**
 * Manages saving of settings down to localstorage or cookies depending on the
 * browser. Also broadcasts any changes to settings so other areas of the app
 * can react.
 */
    .factory('SettingsService', function ($log, localStorageService, $rootScope, SETTING_CHANGED_EVENT, SETTING_CHANGED_OLD_VALUE_KEY, SETTING_CHANGED_NEW_VALUE_KEY, SETTING_CHANGED_PROPERTY_KEY) {
        /**
         * Broadcast that a particular setting has been changed so that other
         * areas of the app can react to this.
         *
         * @param key key that has changed
         * @param oldValue the value before the change
         * @param newValue the new value
         */
        function broadcast(key, oldValue, newValue) {
            var payload = {
                SETTING_CHANGED_OLD_VALUE_KEY: oldValue,
                SETTING_CHANGED_NEW_VALUE_KEY: newValue,
                SETTING_CHANGED_PROPERTY_KEY: key
            };
            var event = SETTING_CHANGED_EVENT;
            $log.debug('broadcasting ' + event, payload);
            $rootScope.$broadcast(event, payload);
        }

        var get = function (key, dflt) {
            var v = localStorageService.get(key);
            $log.debug(key + ' = ' + v);
            if (v !== undefined && v !== null) {
                return v;
            }
            return dflt;
        };

        var getBoolean = function (key, dflt) {
            var v = get(key);
            if (v !== undefined && v !== null) {
                return v == 'true';
            }
            return dflt;
        };

        var set = function (key, value) {
            var oldValue = get(key);
            localStorageService.set(key, value);
            broadcast(key, oldValue, value);
        };

        var setBoolean = function (key, value) {
            var oldValue = getBoolean(key);
            localStorageService.set(key, value ? 'true' : 'false');
            broadcast(key, oldValue, value);
        };

        return {
            get: get,
            getBoolean: getBoolean,
            set: set,
            setBoolean: setBoolean
        };
    })

    .constant('SOURCES', {
        Trello: 'trello',
        Asana: 'asana'
    })

    .constant('ASANA_API_KEY', 'asanaApiKey')

/**
 * Simple layer over Restangular to pull stuff from Asana and return plain JS objects that can then be
 * stored in PouchDB. Performs validation and stuff also.
 * TODO: Move over into asana.js
 */
    .factory('AsanaDataAccess', function ($q, Users, Tasks, $log, SettingsService, ASANA_API_KEY, Database,ASANA_ERRORS) {

        var requiredUserFields = ['workspaces', 'name', 'id'];

        /**
         * Deal with standard errors returned from Asana API.
         * @param deferred
         * @param err
         */
        function errorHandler(deferred, err) {
            $log.error('Error getting user from Asana:', err);
            var humanReadableError = 'Unknown Error';
            if (err.reason) {
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

        function handlePouchError(deferred, err) {
            var message = err.message;
            if (message) {
                deferred.reject('Database error: ' + message + ' (' + err.status + ')');
            }
            else {
                deferred.reject('Database error: Unknown');
            }
        }

        return {
            getUser: function (remote) {
                var deferred = $q.defer();
                function getUserRemotely() {
                    Users.one('me').get().then(function success(user) {
                        for (var i = 0; i < requiredUserFields.length; i++) {
                            var field = requiredUserFields[i];
                            if (user[field] === undefined) {
                                deferred.reject('Missing field ' + field + ' from Asana response for users');
                                return;
                            }
                        }
                        var processedUser = {
                            name: user.name,
                            photo: user.photo.image_128x128,
                            id: user.id,
                            workspaces: user.workspaces,
                            type: 'user',
                            apiKey: SettingsService.get(ASANA_API_KEY)
                        };
                        Database.instance.put(processedUser, 'ActiveUser', function (err, response) {
                            if (!err) {
                                deferred.resolve(processedUser);
                            }
                            else {
                                deferred.reject(err);
                            }
                        });
                    }, _.partial(errorHandler, deferred));
                }

                if (remote) {
                    $log.debug('getting user remotely');
                    getUserRemotely();
                }
                else {
                    $log.debug('trying to get user locally');
                    Database.instance.get('ActiveUser', function (err, doc) {
                        if (err) {
                            getUserRemotely();
                        }
                        else {
                            deferred.resolve(doc);
                        }
                    });
                }
                return deferred.promise;
            },

            clear: function (dbId) {
                var deferred = $q.defer();
                Database.instance.remove(dbId).then(function success() {
                    deferred.resolve();
                }, function error(err) {
                    handlePouchError(deferred, err);
                });
                return deferred.promise;
            },
            clearUser: function () {
                $log.debug('clearing user');
                return this.clear('ActiveUser');
            },
            getTasks: function (workspaceId, remote) {
                var deferred = $q.defer();

                function getTasksRemotely() {
                    var queryParams = {
                        assignee: 'me', // Only return tasks assigned to the user.
                        workspace: workspaceId,
                        completed_since: 'now'
                    };
                    var boundErrorHandler = _.partial(errorHandler, deferred);
                    Tasks.getList(queryParams).then(function success(tasks) {
                        if (tasks.length) {
                            var processedTasks = [];
                            var onGetTaskSuccess = function success(task, tags) {
                                $log.debug('Got tags', tags);
                                var processedTags = [];
                                for (var i = 0; i < tags.length; i++) {
                                    var tag = tags[i];
                                    processedTags.push({
                                        name: tag.name,
                                        id: tag.id
                                    });
                                }
                                processedTasks.push({
                                    name: task.name,
                                    id: task.id,
                                    tags: processedTags
                                });
                                if (processedTasks.length == tasks.length) {
                                    $log.debug('successfully got tasks:', processedTasks);
                                    Database.instance.put({tasks: processedTasks}, dbId).then(function (response) {
                                        $log.debug('yooo', err, response);
                                        deferred.resolve(processedTasks);
                                    }, function (err) {
                                        handlePouchError(deferred, err);
                                    });
                                }
                            };
                            for (var i = 0; i < tasks.length; i++) {
                                var task = tasks[i];
                                var dent = task.id;
                                $log.debug('Getting tags for task' + dent);
                                task.isLoadingTags = true;
                                var boundOnSuccess = _.partial(onGetTaskSuccess, task);
                                Tasks.one(dent).getList('tags').then(boundOnSuccess, boundErrorHandler);
                            }
                        }
                        else {
                            deferred.resolve([]);
                        }
                    }, boundErrorHandler);
                }

                getTasksRemotely();
                return deferred.promise;
            }
        };
    })

/**
 * Manages Asana settings in $rootScope.
 */
    .factory('AsanaSettings', function ($rootScope, SettingsService, Users, Tasks, ASANA_ERRORS, $log, SETTING_CHANGED_EVENT, ASANA_API_KEY, SETTING_CHANGED_PROPERTY_KEY, AsanaDataAccess) {

        /**
         * Setup Asana settings in $rootScope for the first time.
         */
        function resetAsana() {
            $rootScope.asana = {
                apiKey: '',
                workspaces: [],
                tasks: [],
                error: null,
                user: null,
                isLoading: false,
                selectedWorkspace: null,
                isLoadingTasks: false
            };
        }

        /**
         * Setup Asana settings in $rootScope by hitting the Asana API.
         */
        function configureAsanaOnAPIKeyChange() {
            resetAsana();
            $rootScope.asana.isLoading = true;
            AsanaDataAccess.clearUser().then(function () {
                AsanaDataAccess.getUser().then(function success(user) {
                    $rootScope.asana.isLoading = false;
                    if (user) {
                        $log.info('Successfully got user:', user);
                        $rootScope.asana.user = user;
                        var workspaces = user.workspaces;
                        $rootScope.asana.workspaces = workspaces;
                        if (workspaces.length) {
                            $rootScope.asana.selectedWorkspace = workspaces[0];
                        }
                    }
                    else {
                        $log.debug('No user returned, therefore clearing');
                        $rootScope.asana.user = null;
                        $rootScope.asana.workspaces = [];
                        $rootScope.asana.selectedWorkspace = null;
                    }
                }, function failure(err) {
                    $rootScope.asana.isLoading = false;
                    $rootScope.asana.error = err;
                });
            }, function (err) {
                $rootScope.asana.isLoading = false;
                $rootScope.asana.error = err;
            });

        }

        resetAsana();
        if ($rootScope.asana.apiKey) {
            configureAsanaOnAPIKeyChange();
        }

        $rootScope.$watch('asana.selectedWorkspace', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (newValue) {
                    $log.debug('Selected workspace changed to "' + newValue.name + '" so fetching assigned tasks');
                    $rootScope.asana.tasks = [];
                    $rootScope.asana.isLoadingTasks = true;
                    AsanaDataAccess.getTasks(newValue.id).then(function success(tasks) {
                        $log.debug('got tasks:', tasks);
                        $rootScope.asana.isLoadingTasks = false;
                        $rootScope.asana.tasks = tasks;
                    }, function fail(err) {
                        $rootScope.asana.isLoadingTasks = false;
                        $rootScope.asana.error = err;
                    });
                }
            }
        });

        $rootScope.$on(SETTING_CHANGED_EVENT, function (event, data) {
            var property = data[SETTING_CHANGED_PROPERTY_KEY];
            if (property == ASANA_API_KEY) {
                configureAsanaOnAPIKeyChange();
            }
        });

        return {
            resetAsana: resetAsana(),
            configureAsana: configureAsanaOnAPIKeyChange()
        };
    })

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, SettingsService, SOURCES, ASANA_API_KEY, ASANA_ERRORS, Database, $stateParams, $state, AsanaSettings) {

        $scope.SOURCES = SOURCES; // So that we can access these from the templates.

        (function configureTab() {
            $scope.tabState = {
                pomodoro: $stateParams.tab == 'pomodoro',
                tasks: $stateParams.tab == 'tasks',
                asana: $stateParams.tab == 'asana',
                trello: $stateParams.tab == 'trello'
            };
            var tabIsSelected = false;
            var watcher = function (tab, selected) {
                if (selected) {
                    $state.transitionTo('settings', {tab: tab}, {reloadOnSearch: false});
                }
            };
            for (var tabName in $scope.tabState) {
                if ($scope.tabState.hasOwnProperty(tabName)) {
                    if (!tabIsSelected) {
                        tabIsSelected = $scope.tabState[tabName];
                    }
                    var boundWatcher = _.partial(watcher, tabName);
                    var watchVar = 'tabState.' + tabName;
                    $scope.$watch(watchVar, boundWatcher);
                }
            }
            if (!tabIsSelected) {
                $scope.tabState['pomodoro'] = true;
            }
        })();

        $scope.settings = {
            pomodoroRounds: SettingsService.get('pomodoroRounds', 4),
            pomodoroGoal: SettingsService.get('pomodoroGoal', 17),
            pomodoroShortBreak: SettingsService.get('pomodoroShortBreak', 5),
            pomodoroLongBreak: SettingsService.get('pomodoroLongBreak', 15),
            asanaApiKey: SettingsService.get(ASANA_API_KEY),
            trelloApiKey: SettingsService.get('trelloApiKey')
        };

        // These settings are only saved to local storage when onBlur event is fired.
        // This is so that we avoid repeatedly sending invalid requests to Asana/Trello etc.
        var settingsToBlur = ['asanaApiKey', 'trelloApiKey'];

        $scope.tasks = {
            active: []
        };

        /**
         * Toggles the specified boolean setting.
         * @param setting
         */
        $scope.toggle = function (setting) {
            $scope.settings[setting] = !$scope.settings[setting];
        };

        /**
         * Call the correct function on SettingsService depending on whether a
         * boolean or a string.
         * @param property the property to change
         * @param newValue the new value of that property
         */
        function changeSetting(property, newValue) {
            $log.debug(property + ' has changed to ' + newValue);
            var func;
            if (typeof(newValue) == 'boolean') {
                func = SettingsService.setBoolean;
            }
            else {
                func = SettingsService.set;
            }
            func(property, newValue);
        }


        $scope.onBlur = function (key) {
            var newValue = $scope.settings[key];
            $log.debug(key + 'blurred to', newValue);
            changeSetting(key, newValue);
        };

        $scope.asanaApiBlurred = _.partial($scope.onBlur, ASANA_API_KEY);
        $scope.trelloApiBlurred = _.partial($scope.onBlur, 'trelloApiKey');

        /**
         * Watch for changes to settings, validate them and propagate to the settings service
         * for storage if necessary.
         *
         * @param property the setting that is being changed.
         * @param newValue the new value of the setting
         * @param oldValue the previous value of the setting
         */
        var watchSettingsChange = function (property, newValue, oldValue) {
            if (newValue != oldValue) {
                changeSetting(property, newValue);
            }
        };

        for (var property in $scope.settings) {
            if ($scope.settings.hasOwnProperty(property)) {
                var notOnBlur = settingsToBlur.indexOf(property) < 0;
                if (notOnBlur) {
                    $scope.$watch('settings.' + property, _.partial(watchSettingsChange, property));
                }
            }
        }


        $scope.useTask = function (task) {
            $log.debug('put', task);
            Database.instance.put({
                name: task.name,
                source: SOURCES.Asana,
                type: 'task'
            }, task.id).then(function () {
                $scope.$apply(function () {
                    $scope.tasks.active.push(task);
                });
            });
        };


    })
;
