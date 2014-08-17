angular.module('ctimer', ['LocalStorageModule', 'app.settings', 'app.logging'])

    .constant('TimerMode', {
        Pomodoro: 1,
        ShortBreak: 2,
        LongBreak: 3
    })

    .directive('timerWithControls', function (jlog, $rootScope, ctimerService) {
        return {
            restrict: 'AE',
            template: '<span class="pomodoro-timer-with-controls">' +
                '<ctimerd></ctimerd>' +
                '<i class="fa play-or-pause-button" ng-click="playOrPause()" ng-class="{\'fa-play\': !isPlaying(), \'fa-pause\': isPlaying()}"></i>' +
                '</span>',
            controller: function ($scope) {
                $scope.isPlaying = ctimerService.isTicking;
                $scope.playOrPause = function (callback) {
                    if ($scope.isPlaying()) {
                        ctimerService.pause(callback);
                    }
                    else {
                        ctimerService.resume(callback);
                    }
                }
            }
        }
    })

    .directive('ctimerd', function ($rootScope, jlog, TimerMode, ctimerService) {

        var $log = jlog.loggerWithName('ctimerdirective');

        return {
            restrict: 'AE',
            template: '<span class="pomodoro-timer">' +
                '<span class="hours" ng-if="hours">{{pad(hours)}}</span><span ng-if="hours">:</span>' +
                '<span class="minutes" ng-if="minutes !== null">{{pad(minutes)}}</span>:' +
                '<span class="seconds" ng-if="seconds !== null">{{pad(seconds)}}</span>' +
                '</span>',
            scope: true,
            controller: function ($scope) {
                function configureScope() {
                    $log.debug('configureScope');
                    var sessionLength;
                    if ($scope.records.currentMode == TimerMode.Pomodoro) {
                        sessionLength = $scope.settings.pomodoroLength;
                    }
                    else if ($scope.records.currentMode == TimerMode.ShortBreak) {
                        sessionLength = $scope.settings.pomodoroShortBreak;
                    }
                    else if ($scope.records.currentMode == TimerMode.LongBreak) {
                        sessionLength = $scope.settings.pomodoroLongBreak;
                    }
                    else {
                        $log.error('Unknown timer mode:', $scope.records.currentMode);
                        $scope.err = 'Unknown timer mode';
                        return;
                    }
                    sessionLength = sessionLength * 60; // sessionLength is stored in minutes
                    var currSeconds = $scope.records.seconds;
                    if (!isNaN(currSeconds)) {
                        $log.debug('sessionLength', sessionLength);
                        $log.debug('currSeconds', currSeconds);
                        var secondsRemaining = sessionLength - currSeconds;
                        $log.debug('secondsRemaining', secondsRemaining);
                        var seconds = Math.floor(secondsRemaining % 60);
                        var minutes = Math.floor((secondsRemaining / 60) % 60);
                        var hours = Math.floor((secondsRemaining / 60) / 60 % 60);
                            $scope.hours = hours;
                            $scope.minutes = minutes;
                            $scope.seconds = seconds;

                        $log.debug('computed time:', {
                            hours: hours,
                            minutes: minutes,
                            seconds: seconds
                        });
                    }
                    else {
                        $log.warn('currSeconds isNaN therefore ignoring', {currSeconds: currSeconds});
                    }

                }
                $scope.hours = null;
                $scope.minutes = null;
                $scope.seconds = null;
                configureScope();
                $log.debug('waiting for ctimerService to load before initialising timer directive');
                ctimerService.get(function (err, records) { // Ensure that timer has finisehd loading.
                    if (!err) {
                        $log.debug('ctimerService has loaded', {err: err, records: records});
                        configureScope();
                        $scope.$watch('records.seconds', function () {
                            $log.debug('recieved tick from $rootscope');
                            configureScope();
                        });
                    }
                    else {
                        $log.error('cannot load ctimer directive as ctimerService failed', {err: err});
                    }

                });

                $scope.pad = function (n) {
                    return ("00" + n).substr(-2,2);
                }
            }

        }
    })

    // Save down num. seconds in current session to disk every SECONDS_DIVISOR seconds.
    .constant('SECONDS_DIVISOR', 2)

    .factory('ctimerService', function ($rootScope, Settings, $q, jlog, localStorageService, lazyPouchDB, TimerMode, SECONDS_DIVISOR) {

        var waitForSettings = $q.defer();

        var $log = jlog.loggerWithName('ctimer');

        var token;

        $rootScope.records = {
            seconds: null,
            currentRound: null,
            completedRounds: null,
            currentMode: null
        };

        function writeRecords(records, callback) {
            records._id = 'ctimerService';
            $log.debug('writeRecords', records);
            lazyPouchDB.retryUntilWritten(records).then(function (resp) {
                $log.debug('Successfully pushed timer records to disk');

                if (callback) callback(null, resp);
            }, function (err) {
                $log.error('error writing timer records down to disk', err);
                if (callback) callback(err);
            });
        }

        function initDefaults(callback) {
            var defaults = {
                seconds: 0,
                currentRound: 1,
                completedRounds: 0,
                currentMode: TimerMode.Pomodoro,
                _id: 'ctimerService'
            };
            writeRecords(defaults, callback);
        }

        function init() {
            var settingsInitialised = false;
            var recordsInitialised = false;

            function checkForInitialisationCompletion() {
                var done = settingsInitialised && recordsInitialised;
                $log.debug('checkForInitialisationCompletion:', {done: done});
                if (done) {
                    waitForSettings.resolve();
                }
            }

            function watchSettings() {
                var handlePomodoroSettingsChange = function (setting, newValue) {
                    $log.debug('handlePomodoroSettingsChange', newValue);
                    $log.debug(setting.toString() + ' has changed:', newValue);
                    evaluateState();
                };
                _.each(['settings.pomodoroLength'], function (setting) {
                    $log.debug('watching "' + setting + '"');
                    $rootScope.$watch(setting, _.partial(handlePomodoroSettingsChange, setting));
                    $log.debug('watched "' + setting + '"');
                });
            }

            function watchRecords() {
                $log.debug('watchRecords');
                function receiveWatch(key, newValue, oldValue) {
                    $log.debug('receiveWatch', {key: key, newValue: newValue, oldValue: oldValue});
                    if (newValue !== oldValue) {
                        var records = $rootScope.records;
                        if (key == 'seconds') {
                            var shouldSaveSeconds = !(newValue % SECONDS_DIVISOR);
                            // Avoid writing down records every tick.
                            if (shouldSaveSeconds) {
                                $log.debug('receiveWatch: saving seconds down as multiple of ' + SECONDS_DIVISOR.toString());
                                writeRecords(records);
                            }
                            else {
                                $log.debug('receiveWatch: not saving seconds down as isnt a multiple of ' + SECONDS_DIVISOR.toString());
                            }
                        }
                        else {
                            writeRecords(records);
                        }
                    }
                }

                _.each(['seconds', 'currentRound', 'completedRounds', 'currentMode'], function (key) {
                    $log.debug('watchRecords - watching ' + key);
                    $rootScope.$watch('records.' + key, _.partial(receiveWatch, key));
                });
            }

            (function getSettings() {
                Settings.getAll(function (err) {
                    if (err) {
                        waitForSettings.reject(err);
                    }
                    else {
                        watchSettings();
                        settingsInitialised = true;
                        checkForInitialisationCompletion();
                    }
                });
            })();

            (function getRecords() {
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
                                    watchRecords();
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
                                watchRecords();
                            }
                        });
                    }
                    else {
                        waitForSettings.reject(err);
                    }

                })
            })();

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

        function sessionFinished(mode) {
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
            $log.debug('sessionFinished', {seconds: $rootScope.records.seconds, sessionLength: sessionLengthInSeconds, mode: $rootScope.records.currentMode});
            return sessionLengthInSeconds <= $rootScope.records.seconds;
        }

        /**
         * Contract num. seconds on the clock against the Pomodoro variables
         * and progress to next stage if neccessary.
         */
        function evaluateState() {
            $log.debug('evaluateState');
            if (sessionFinished($rootScope.records.currentMode)) {
                $rootScope.records.seconds = 0;
                if ($rootScope.records.currentMode == TimerMode.Pomodoro) {
                    $log.info('Pomodoro has finished');
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
                    $log.info('Long break has finished');
                    $rootScope.records.currentMode = TimerMode.Pomodoro;
                }
                else if ($rootScope.records.currentMode == TimerMode.ShortBreak) {
                    $log.info('Short break has finished');
                    $rootScope.records.currentMode = TimerMode.Pomodoro;
                }
                else {
                    throw('No such mode:', $rootScope.records.currentMode);
                }

            }
            // e.g. on a settings change
            else if ($rootScope.records.currentRound > $rootScope.settings.pomodoroRounds) {
                $rootScope.records.currentMode = TimerMode.LongBreak;
                $rootScope.records.seconds = 0;
                $rootScope.records.currentRound = 1;
            }
            else {
                $log.info('Nothing has finished');
            }
            broadcastTick();
        }

        function tick() {
            $rootScope.records.seconds += 1;
            // A "Session" refers to either a Pomodoro, Short Break or a Long Break.
            evaluateState();
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
                    token = setInterval(function () {
                        tick();
                        // setInterval is outside of angular's $digest cycle therefore must
                        // force the digest after each tick.
                        $rootScope.$apply();
                    }, 1000);
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
                    evaluateState();
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
            isTicking: function (isTicking) {
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