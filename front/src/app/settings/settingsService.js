angular.module('app.settings')

    .constant('SETTINGS_MAP_REDUCE', {
        name: 'settings_index',
        index: {
            map: function (doc) {
                console.log('settings_index map', doc);
                if (doc.type == 'setting') {
                    emit(doc._id, doc);
                }
            },
            reduce: function (key, values, rereduce) {
                var i, settings;
                if (rereduce) {
                    settings = {};
                    for (i = 0; i < values.length; i++) {
                        var previousSettings = values[i];
                        for (var k in previousSettings) {
                            if (previousSettings.hasOwnProperty(k)) {
                                if (settings[k]) {
                                    if (settings[k].ts < previousSettings[k].ts) {
                                        settings[k] = previousSettings[k];
                                    }
                                }
                                else {
                                    settings[k] = previousSettings[k];
                                }
                            }
                        }
                    }
                }
                else {
                    settings = {};
                    for (i = 0; i < key.length; i++) {
                        var value = values[i];
                        var name = value.name;
                        var ts = value.ts;
                        if (settings[name]) {
                            if (settings[name].ts < ts) {
                                settings[name] = value;
                            }
                        }
                        else {
                            settings[name] = value;
                        }
                    }
                }
                return settings;
            }
        }
    })

    .config(function (lazyPouchDBProvider, SETTINGS_MAP_REDUCE) {
        lazyPouchDBProvider.INDEXES[SETTINGS_MAP_REDUCE.name] = SETTINGS_MAP_REDUCE.index;
    })

    .factory('SettingsService', function (lazyPouchDB, $rootScope) {
        return {
            set: function (key, value, callback) {
                var wrappedCallback = function (err) {
                    $rootScope.$apply(function () {
                        if (callback) callback(err);
                    })
                };
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.post({type: 'setting', ts: new Date().getTime(), name: key, value: value}).then(function (resp) {
                        wrappedCallback(null);
                    }, wrappedCallback);
                }, wrappedCallback);
            },
            get: function (key, callback) {
                this.getAll(function (err, settings) {
                    var value;
                    if (!err) {
                        value = settings[key];
                    }
                    if (callback)  callback(err, value);
                });
            },
            getAll: function (callback) {
                callback = callback || function () {};
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.query('settings_index', function (err, response) {
                        $rootScope.$apply(function () {
                            if (err) {
                                callback(err);
                            }
                            else if (response.rows.length) {
                                var settings = response.rows[0].value;
                                for (var k in settings) {
                                    if (settings.hasOwnProperty(k)) {
                                        settings[k] = settings[k].value;
                                    }
                                }
                                callback(null, settings);
                            }
                            else {
                                callback(null, {});
                            }
                        });
                    });
                }, function (err) {
                    $rootScope.$apply(function () {
                        if (callback) callback(err);
                    })
                });
            }
        };
    })

    .factory('Settings', function ($rootScope, SettingsService, $q, $log) {
        var deferred = $q.defer();

        $rootScope.settings = {
            asanaApiKey: null,
            pomodoroRounds: null,
            pomodoroGoal: null,
            pomodoroShortBreak: null,
            pomodoroLength: null,
            pomodoroLongBreak: null
        };

        $log.debug('Initialising settings from PouchDB');
        SettingsService.getAll(function (err, settings) {
            if (!err) {
                $rootScope.loading = false;
                $log.info('settings:', settings);
                $rootScope.settings = settings;
                $rootScope.settings.pomodoroLength = settings.pomodoroLength || 25;
                $rootScope.settings.pomodoroRounds = settings.pomodoroRounds || 4;
                $rootScope.settings.pomodoroGoal = settings.pomodoroGoal || 17;
                $rootScope.settings.pomodoroShortBreak = settings.pomodoroShortBreak || 5;
                $rootScope.settings.pomodoroLongBreak = settings.pomodoroLongBreak || 15;
                $rootScope.settings.asanaApiKey = settings.asanaApiKey;
                $log.debug('Initialised settings from PouchDB');
                deferred.resolve();
            }
            else {
                $log.error('error getting settings:', err);
                deferred.reject(err);
            }
        });

        function waitForLoad(callback) {
            deferred.promise.then(function () {
                callback(null, $rootScope.settings);
            }, callback);
        }

        return {
            waitForLoad: waitForLoad,
            get: SettingsService.get,
            set: function (key, value, callback) {
                waitForLoad(function (err) {
                    if (!err) {
                        $rootScope.settings[key] = value;
                        SettingsService.set(key, value, callback);
                    }
                    else {

                    }
                });
            },
            getAll: waitForLoad
        }
    });