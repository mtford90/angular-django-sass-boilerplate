angular.module('app.settings', [
    'app.asana.restangular',
    'app.asana.data',
    'dropdown',
    'ui.sortable',
    'pouch',
    'LocalStorageModule',
    'ui.router',
    'ctimer'
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



    .controller('SettingsCtrl', function SettingsCtrl($scope, $log, ASANA_ERRORS, $stateParams, $state, $rootScope, Settings, AsanaData) {

        // These settings are only saved to local storage when onBlur event is fired.
        // This is so that we avoid repeatedly sending invalid requests to Asana etc.
        var settingsToBlur = ['asanaApiKey'];

        var $parentScope = $scope.$parent;

        if (!$parentScope.asana) {
            $parentScope.asana = {
                user: null,
                err: null,
                loading: false
            };
        }

        function getAsanaUser() {
            $log.debug('init');
            $parentScope.asana.loading = true;
            $parentScope.asana.err = null;
            $parentScope.asana.user = null;
            AsanaData.getUser(function (err, user) {
                $parentScope.asana.loading = false;
                $log.debug('err, user', err, user);
                $parentScope.asana.err = err ? err.statusText : null;
                $parentScope.asana.user = user;
            });
        }

        $scope.asanaApiBlurred = function () {
            Settings.set('asanaApiKey', $scope.settings.asanaApiKey);
            getAsanaUser();
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
                Settings.set(property, newValue);
            }
        };

        $scope.loading = true;

        Settings.waitForLoad(function (err, settings) {
            $scope.loading = false;
            if (err) {
                $log.error('Error loading settings:', err);
            }
            else {
                if (settings.asanaApiKey) {
                    if (settings.asanaApiKey.trim().length) {
                        var asanaInitialised = ($parentScope.asana.user || $parentScope.asana.err || $parentScope.asana.loading);
                        if (!asanaInitialised) {
                            getAsanaUser();
                        }
                    }
                }
                for (var property in $parentScope.settings) {
                    if ($parentScope.settings.hasOwnProperty(property)) {
                        var notOnBlur = settingsToBlur.indexOf(property) < 0;
                        if (notOnBlur) {
                            $parentScope.$watch('settings.' + property, _.partial(watchSettingsChange, property));
                        }
                    }
                }
            }
        });

    })
;
