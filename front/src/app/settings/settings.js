angular.module('app.settings', [
    'app.asana',
    'LocalStorageModule'
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

/**
 * Abstract away key-value storage so can change this in the future.
 */
    .factory('SettingsService', function ($log, localStorageService) {
        return {
            'get': function (key, dflt) {
                var v = localStorageService.get(key);
                $log.debug(key + ' = ' + v);
                if (v !== undefined && v !== null) {
                    return v;
                }
                return dflt;
            },
            'set': function (key, value) {
                localStorageService.set(key, value);
            }
        };
    })

    .constant('SOURCES', {
        Trello: 'trello',
        Asana: 'asana'
    })

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, User, SettingsService, SOURCES) {

        $scope.SOURCES = SOURCES; // So that we can access these from the templates.

        $scope.settings = {
            pomodoroRounds: SettingsService.get('pomodoroRounds', 4),
            pomodoroGoal: SettingsService.get('pomodoroGoal', 17),
            pomodoroShortBreak: SettingsService.get('pomodoroShortBreak', 5),
            pomodoroLongBreak: SettingsService.get('pomodoroLongBreak', 15),
            asanaApiKey: SettingsService.get('asanaApiKey'),
            trelloApiKey: SettingsService.get('trelloApiKey'),
            pomodoroHidden: SettingsService.get('pomodoroHidden', 'true') == 'true',
            tasksHidden: SettingsService.get('tasksHidden', 'true') == 'true',
            asanaHidden: SettingsService.get('asanaHidden', 'true') == 'true',
            trelloHidden: SettingsService.get('trelloHidden', 'true') == 'true'
        };

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
         * Watch for changes to settings, validate them and propagate to the settings service
         * for storage if necessary.
         *
         * @param property the setting that is being changed.
         * @param newValue the new value of the setting
         * @param oldValue the previous value of the setting
         */
        var watchSettingsChange = function (property, newValue, oldValue) {
            if (newValue != oldValue) {
                $log.debug(property + ' has changed to ' + newValue);
                if (typeof(newValue) == 'boolean') {
                    SettingsService.set(property, newValue ? 'true' : 'false');
                }
                else {
                    SettingsService.set(property, newValue);
                }
            }
        };

        for (var property in $scope.settings) {
            if ($scope.settings.hasOwnProperty(property)) {
                $scope.$watch('settings.' + property, _.partial(watchSettingsChange, property));
            }
        }


    })

;
