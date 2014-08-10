angular.module('app.settings', [
    'app.asana.restangular',
    'app.asana.data',
    'dropdown',
    'ui.sortable',
    'pouch',
    'LocalStorageModule',
    'ui.router'
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




    .constant('SOURCES', {
        Asana: 'asana'
    })

    .constant('ASANA_API_KEY', 'asanaApiKey')

    .factory('AsanaSettings', function ($rootScope, SettingsService, ASANA_ERRORS, $log, ASANA_API_KEY,  AsanaData, $q) {

        function resetAsanaScope() {
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

        function refreshAsana() {
            var deferred = $q.defer();
            resetAsanaScope();
            AsanaData.reset().then(function () {
                configureAsanaOnAPIKeyChange().then(function () {
                    deferred.resolve();
                }, deferred.reject);
            }, deferred.reject);
            return deferred.promise;
        }

        /**
         * Setup Asana settings in $rootScope by hitting the Asana API.
         */
        function configureAsanaOnAPIKeyChange() {
            var deferred = $q.defer();
            resetAsanaScope();
            $rootScope.asana.isLoading = true;
            AsanaData.getUser().then(function success(user) {
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
                deferred.resolve();
            }, function failure(err) {
                $rootScope.asana.isLoading = false;
                deferred.reject(err);
            });
            return deferred.promise;
        }

        resetAsanaScope();
        if ($rootScope.asana.apiKey) {
            configureAsanaOnAPIKeyChange();
        }

        return {
            refreshAsana: refreshAsana,
            configureAsana: configureAsanaOnAPIKeyChange()
        };
    })

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, SOURCES, ASANA_API_KEY, ASANA_ERRORS, $stateParams, $state, AsanaSettings, SettingsService) {
        $scope.SOURCES = SOURCES; // So that we can access these from the templates.


        $scope.loading = true;
        $scope.settings = {
            pomodoroRounds: null,
            pomodoroGoal: null,
            pomodoroShortBreak: null,
            pomodoroLongBreak: null,
            asanaApiKey: null
        };

        SettingsService.getAll(function (err, settings) {
            if (!err) {
                $scope.loading = false;
                $log.info('settings:', settings);
                $scope.settings.pomodoroRounds = settings.pomodoroRounds || 4;
                $scope.settings.pomodoroGoal = settings.pomodoroGoal || 17;
                $scope.settings.pomodoroShortBreak = settings.pomodoroShortBreak || 5;
                $scope.settings.pomodoroLongBreak = settings.pomodoroLongBreak || 15;
                $scope.settings.asanaApiKey = settings.asanaApiKey;
            }
            else {
                $log.error('error getting settings:', err);
                // TODO: Handle error here.
            }
        });



        // These settings are only saved to local storage when onBlur event is fired.
        // This is so that we avoid repeatedly sending invalid requests to Asana etc.
        var settingsToBlur = ['asanaApiKey'];

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

        $scope.refreshAsana = AsanaSettings.refreshAsana;

        $scope.useTask = function (task) {

        };

    })
;
