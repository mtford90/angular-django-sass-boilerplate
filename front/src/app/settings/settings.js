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



    .constant('SOURCES', {
        Trello: 'trello',
        Asana: 'asana'
    })

    .constant('ASANA_API_KEY', 'asanaApiKey')


/**
 * Manages Asana settings in $rootScope.
 */
    .factory('AsanaSettings', function ($rootScope, SettingsService, ASANA_ERRORS, $log, SETTING_CHANGED_EVENT, ASANA_API_KEY, SETTING_CHANGED_PROPERTY_KEY, AsanaData, $q) {

        /**
         * Setup Asana settings in $rootScope for the first time.
         */
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
            $log.info('configuring ASANA');
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

    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, SOURCES, ASANA_API_KEY, ASANA_ERRORS, $stateParams, $state, AsanaSettings) {

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

        $scope.refreshAsana = AsanaSettings.refreshAsana;

        $scope.useTask = function (task) {

        };

    })
;
