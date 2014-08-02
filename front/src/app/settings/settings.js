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

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, User, SettingsService, Sources) {
        $scope.settings = {
            pomodoroRounds: SettingsService.get('pomodoro_rounds', 4),
            pomodoroGoal: SettingsService.get('goal', 17),
            pomodoroShortBreak: SettingsService.get('shortBreak', 5),
            pomodoroLongBreak: SettingsService.get('longBreak', 15),
            asanaApiKey: SettingsService.get('asanaApiKey'),
            trelloApiKey: SettingsService.get('trelloApiKey')
        };

        $scope.tasks = {
            active: [
                {
                    title: 'Do something really well',
                    project: ['project'],
                    tags: ['tag'],
                    source: Sources.Asana
                },
                {
                    title: 'blah de bla de bla',
                    project: 'Retention Sprint #1',
                    tags: ['label'],
                    source: Sources.Trello
                }
            ],
            asana: [],
            trello: []
        };

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
                SettingsService.set(property, newValue);
            }
        };

        for (var property in $scope.settings) {
            if ($scope.settings.hasOwnProperty(property)) {
                $scope.$watch('settings.' + property, _.partial(watchSettingsChange, property));
            }
        }


    })

;
