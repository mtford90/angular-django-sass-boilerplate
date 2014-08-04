angular.module('app.settings', [
    'app.asana',
    'LocalStorageModule',
    'dropdown',
    'ui.sortable'
])

    .config(function config($stateProvider) {
        $stateProvider.state('settings', {
            url: '/settings',
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

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, Users, Workspaces, Projects, Tasks, SettingsService, SOURCES, SETTING_CHANGED_EVENT, SETTING_CHANGED_PROPERTY_KEY, SETTING_CHANGED_NEW_VALUE_KEY, ASANA_API_KEY, ASANA_ERRORS) {

        $scope.SOURCES = SOURCES; // So that we can access these from the templates.

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
            active: [
                {
                    title: 'Do something really well',
                    project: 'project',
                    tags: ['tag'],
                    source: SOURCES.Asana
                },
                {
                    title: 'blah de bla de bla',
                    project: 'Retention Sprint #1',
                    tags: ['label'],
                    source: SOURCES.Trello
                }
            ],
            asana: [],
            trello: []
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
        function resetAsana() {
            $scope.asana = {
                workspaces: [],
                tasks: [],
                error: null,
                user: null,
                isLoading: false,
                selectedWorkspace: null,
                isLoadingTasks: false
            };
        }

        resetAsana();

        var configureAsana = function () {
            resetAsana();
            $scope.asana.isLoading = true;
            Users.one('me').get().then(function success(user) {
                $scope.asana.isLoading = false;
                $log.info('Successfully got user:', user);
                var data = user;
                if (data) {
                    $scope.asana.user = data;
                    var workspaces = data.workspaces;
                    if (workspaces) {
                        $scope.asana.workspaces = workspaces;
                        if (workspaces.length) {
                            $scope.asana.selectedWorkspace = workspaces[0];
                        }
                    }
                    else {
                        $scope.asana.error = 'No workspaces returned from Asana';
                    }
                }
                else {
                    $scope.asana.error = 'No user data returned from Asana.';
                }
            }, function fail(err) {
                $scope.asana.isLoading = false;
                if (err.reason && err.code) {
                    if (err.code == ASANA_ERRORS.NO_API_KEY) {
                        // Do nothing
                    }
                    else {
                        $scope.asana.error = err.reason;
                    }
                }
                else if (err.status == 401) {
                    $scope.asana.error = 'Invalid API Key';
                }
                else if ('errors' in err.data) {
                    if (err.data.errors.length) {
                        $scope.asana.error = err.data.errors[0];
                    }
                    else {
                        $scope.asana.error = 'Unknown Error';
                    }
                }
                else {
                    $scope.asana.error = 'Unknown Error: HTTP ' + err.status;
                }
                $log.error('Error getting user:', err);
            });
        };

        if ($scope.settings.asanaApiKey) {
            configureAsana();
        }

        $scope.$on(SETTING_CHANGED_EVENT, function (event, data) {
            var property = data[SETTING_CHANGED_PROPERTY_KEY];
            if (property == ASANA_API_KEY) {
                configureAsana();
            }
        });

        $scope.$watch('asana.selectedWorkspace', function (newValue, oldValue) {
            if (newValue !== oldValue) {
                if (newValue) {
                    $log.debug('Selected workspace changed to "' + newValue.name + '" so fetching assigned tasks');
                    $scope.asana.tasks = [];
                    $scope.asana.isLoadingTasks = true;
                    var queryParams = {
                        assignee: 'me', // Only return tasks assigned to the user.
                        workspace: newValue.id,
                        completed_since: 'now'
                    };
                    Tasks.getList(queryParams).then(function success(tasks) {
                        $log.debug('Successfully got completed tasks', tasks);
                        $scope.asana.isLoadingTasks = false;
                        var onSuccess = function success(task, tags) {
                            $log.debug('Got tags', tags);
                            task.tags = tags;
                            task.isLoadingTags = false;
                        };
                        var onFail = function failure(task) {
                            task.isLoadingTags = false;
                            // TODO: Handle failure.
                        };

                        for (var i = 0; i < tasks.length; i++) {
                            var task = tasks[i];
                            var dent = task.id;
                            $log.debug('Getting tags for task' + dent);
                            task.isLoadingTags = true;
                            var boundOnSuccess = _.partial(onSuccess, task);
                            var boundOnFail = _.partial(onFail, task);
                            Tasks.one(dent).getList('tags').then(boundOnSuccess, boundOnFail);
                        }
                        $scope.asana.tasks = tasks;
                    }, function fail() {
                        $scope.asana.isLoadingTasks = false;
                    });

                }
            }
        });
    })
;
