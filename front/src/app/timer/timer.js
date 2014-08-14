angular.module('ctimer', ['LocalStorageModule', 'app.settings', 'app.logging'])

    .constant('TimerMode', {
        Pomodoro: 1,
        ShortBreak: 2,
        LongBreak: 3
    })

    .factory('ctimerService', function ($rootScope, Settings, $q, jlog, localStorageService, lazyPouchDB, TimerMode) {

        var waitForSettings = $q.defer();

        var $log = jlog.loggerWithName('ctimer');

        var token;



        $rootScope.records = {
            seconds: null,
            currentRound: null,
            completedRounds: null,
            currentMode: null
        };

        function initDefaults(callback) {
            lazyPouchDB.retryUntilWritten({
                seconds: 0,
                currentRound: 1,
                completedRounds: 0,
                currentMode: TimerMode.Pomodoro,
                _id: 'ctimerService'
            }).then(function (resp) {
                if (callback) callback(null, resp);
            }, function (err) {
                if (callback) callback(err);
            });
        }

        function init() {
            var settingsInitialised = false;
            var recordsInitialised = false;

            function checkForInitialisationCompletion() {
                var done = settingsInitialised && recordsInitialised;
                $log.debug('checkForInitialisationCompletion:', done);
                if (done) {
                    waitForSettings.resolve();
                }
            }

            Settings.getAll(function (err) {
                if (err) {
                    waitForSettings.reject(err);
                }
                else {
                    $rootScope.$watch('settings.pomodoroLength', function (newValue, oldValue) {
                        if (newValue !== oldValue) {

                        }
                    });
                    $rootScope.$watch('settings.pomodoroShortBreak', function (newValue, oldValue) {
                        if (newValue !== oldValue) {

                        }
                    });
                    $rootScope.$watch('settings.pomodoroLongBreak', function (newValue, oldValue) {
                        if (newValue !== oldValue) {

                        }
                    });
                    settingsInitialised = true;
                    checkForInitialisationCompletion();
                }
            });


            lazyPouchDB.getPromise(function (err, pouch) {
                if (!err) {
                    pouch.get('ctimerService', function (err, doc) {
                        function reset() {
                            initDefaults(function (err, defaults) {
                                if (err) {
                                    waitForSettings.reject(err);
                                }
                                else {
                                    $rootScope.records = defaults;
                                    recordsInitialised = true;
                                    checkForInitialisationCompletion();
                                }
                            })
                        }

                        if (err) {
                            if (err.status == 404) {
                                reset();
                            }
                            else {
                                waitForSettings.reject(err);
                            }
                        }
                        else {
                            var recordsUpToDate = doc.seconds !== undefined &&
                                doc.currentRound !== undefined &&
                                doc.completedRounds !== undefined &&
                                doc.currentMode !== undefined;
                            if (recordsUpToDate) {
                                $rootScope.records = doc;
                                recordsInitialised = true;
                                checkForInitialisationCompletion();
                            }
                            else {
                                $log.error('records incomplete, resetting', doc);
                                reset();
                            }
                        }
                    });
                }
                else {
                    waitForSettings.reject(err);
                }

            })
        }

        init();

        function pause(callback) {
            $log.info('pausing');
            waitForSettings.promise.then(function () {
                if (token) {
                    clearInterval(token);
                    token = null;
                }
                $log.info('paused');
                if (callback) callback();
            }, function (err) {
                if (callback) callback(err);
            });
        }

        /**
         * Broadcast num. seconds via rootscope.
         */
        function broadcastTick() {
            var seconds = $rootScope.records.seconds % 60;
            var minutes = Math.floor($rootScope.records.seconds / 60 % 60);
            var hours = Math.floor(minutes / 60);
            $log.debug('records: ', $rootScope.records);
            $rootScope.$broadcast('tick', {
                hours: hours,
                minutes: minutes,
                seconds: seconds,
                currentRound: $rootScope.records.currentRound,
                currentMode: $rootScope.records.currentMode,
                completedRounds: $rootScope.records.completedRounds
            });
        }

        function sessionFinished (mode) {
            var sessionLength;
            if ($rootScope.records.currentMode == TimerMode.Pomodoro) {
                sessionLength = $rootScope.settings.pomodoroLength;
            }
            else if ($rootScope.records.currentMode == TimerMode.LongBreak) {
                sessionLength = $rootScope.settings.pomodoroLongBreak;
            }
            else if ($rootScope.records.currentMode == TimerMode.ShortBreak) {
                sessionLength = $rootScope.settings.pomodoroShortBreak;
            }
            else {
                throw 'Unknown mode:' + $rootScope.records.currentMode.toString();
            }
            var sessionLengthInSeconds = sessionLength * 60;
            return sessionLengthInSeconds == $rootScope.records.seconds;
        }

        function tick() {
            $rootScope.records.seconds++;
            // A "Session" refers to either a Pomodoro, Short Break or a Long Break.
            if (sessionFinished($rootScope.records.currentMode)) {
                $rootScope.records.seconds = 0;
                if ($rootScope.records.currentMode == TimerMode.Pomodoro) {
                    $rootScope.records.currentRound++;
                    $rootScope.records.completedRounds++;
                    var pomodoroRounds = $rootScope.settings.pomodoroRounds;
                    if ($rootScope.records.currentRound > pomodoroRounds) {
                        $rootScope.records.currentRound = 0;
                        $rootScope.records.currentMode = TimerMode.LongBreak;
                    }
                    else {
                        $rootScope.records.currentMode = TimerMode.ShortBreak;
                    }
                }
                else if ($rootScope.records.currentMode == TimerMode.LongBreak) {
                    $rootScope.records.currentMode = TimerMode.Pomodoro;
                }
                else if ($rootScope.records.currentMode == TimerMode.ShortBreak) {
                    $rootScope.records.currentMode = TimerMode.Pomodoro;
                }

            }
            broadcastTick();
        }

        return {
            pause: pause,
            reset: function (callback) {
                $log.info('resetting');
                pause(function (err) {
                    if (!err) {
                        initDefaults(function (err, defaults) {
                            if (!err) {
                                $rootScope.records = defaults;
                                $log.debug('defaults initialised:', $rootScope.records);
                                $log.info('reset');
                                if (callback) callback();
                            }
                            else {
                                callback(err);
                            }
                        });
                    }
                    else {
                        if (callback) callback(err);
                    }
                });
            },
            resume: function (callback) {
                waitForSettings.promise.then(function () {
                    token = setInterval(tick, 1000);
                    if (callback) callback();
                }, function (err) {
                    if (callback) callback(err);
                })
            },
            set: function (seconds, callback) {
                $log.debug('set');
                waitForSettings.promise.then(function () {
                    $log.debug('set2');
                    $rootScope.records.seconds = seconds;
                    if (callback) callback();
                }, function (err) {
                    if (callback) callback(err);
                });
            },
            get: function (callback) {
                waitForSettings.promise.then(function () {
                    if (callback) {
                        callback(null, $rootScope.records);
                    }
                }, function (err) {
                    if (callback) callback(err);
                });
            },
            isTicking : function (isTicking) {
                return token !== null && token !== undefined;
            },
            // START: For testing purposes
            _getToken: function () {
                return token;
            },
            _inject: function (recordsToInject, callback) {
                $log.info('_inject:', recordsToInject);
                waitForSettings.promise.then(function () {
                    for (var key in recordsToInject) {
                        if (recordsToInject.hasOwnProperty(key)) {
                            $rootScope.records[key] = recordsToInject[key];
                        }
                    }
                    if (callback) {
                        callback(null, $rootScope.records);
                    }
                }, function (err) {
                    if (callback) callback(err);
                });
            }
            // END: For testing purposes
        }
    })
;