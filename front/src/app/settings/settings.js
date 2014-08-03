angular.module('app.settings', [
    'app.asana',
    'LocalStorageModule',
    'dropdown'
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

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, Users, SettingsService, SOURCES,
                                                      SETTING_CHANGED_EVENT,
                                                      SETTING_CHANGED_PROPERTY_KEY,
                                                      SETTING_CHANGED_NEW_VALUE_KEY,
                                                      ASANA_API_KEY) {

        $scope.SOURCES = SOURCES; // So that we can access these from the templates.

        $scope.settings = {
            pomodoroRounds: SettingsService.get('pomodoroRounds', 4),
            pomodoroGoal: SettingsService.get('pomodoroGoal', 17),
            pomodoroShortBreak: SettingsService.get('pomodoroShortBreak', 5),
            pomodoroLongBreak: SettingsService.get('pomodoroLongBreak', 15),
            asanaApiKey: SettingsService.get(ASANA_API_KEY),
            trelloApiKey: SettingsService.get('trelloApiKey'),
            pomodoroHidden: SettingsService.getBoolean('pomodoroHidden', true),
            tasksHidden: SettingsService.getBoolean('tasksHidden', true),
            asanaHidden: SettingsService.getBoolean('asanaHidden', true),
            trelloHidden: SettingsService.getBoolean('trelloHidden', true)
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

        $scope.togglePomodoro = _.partial($scope.toggle, 'pomodoroHidden');
        $scope.toggleTasks = _.partial($scope.toggle, 'tasksHidden');
        $scope.toggleAsana = _.partial($scope.toggle, 'asanaHidden');
        $scope.toggleTrello = _.partial($scope.toggle, 'trelloHidden');

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

        $scope.asana = {
            workspaces: [],
            projects: [],
            error: null
        };

        $scope.$on(SETTING_CHANGED_EVENT, function (event, data) {
            var property = data[SETTING_CHANGED_PROPERTY_KEY];
            if (property == ASANA_API_KEY) {
                var user = Users.one('me').get().then(function success() {
                    $log.info('Successfully got user:', user);
                    var data = user.data;
                    if (data) {
                        var workspaces = data.workspaces;
                        if (workspaces) {
                            $scope.asana.workspaces = workspaces;
                        }
                        else {
                            // TODO: Error communicating with Asana.
                        }
                    }
                    else {

                        // TODO: Error communicating with Asana.
                    }

                }, function fail(err) {
                    $log.error('Error getting user:', err);
                });
            }
        });
    })
;
