angular.module('app.settings', [
    'app.asana.restangular',
    'app.asana.data',
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
 * Manages Asana settings in $rootScope.
 */
    .factory('AsanaSettings', function ($rootScope, SettingsService, ASANA_ERRORS, $log, SETTING_CHANGED_EVENT, ASANA_API_KEY, SETTING_CHANGED_PROPERTY_KEY, AsanaDataAccess) {

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
