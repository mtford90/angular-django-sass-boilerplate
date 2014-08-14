describe('ctimer', function () {
    var $rootScope, ctimerService, TimerMode, Settings;

    function reset(done) {
        clearStorage().then(function () {
            ctimerService.reset(function (err) {
                if (!err) {
                    done();
                }
                else {
                    done(err);
                }
            });
        }, done);
    }

    beforeEach(function (done) {
        module('ctimer', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q);
        });

        inject(function (_$rootScope_, _ctimerService_, _TimerMode_, _Settings_) {
            $rootScope = _$rootScope_;
            ctimerService = _ctimerService_;
            TimerMode = _TimerMode_;
            Settings = _Settings_;
        });
        done();

    });

    describe('basics', function () {

        beforeEach(reset);

        it('tick', function (done) {
            ctimerService.resume(function (err) {
                assert.notOk(err);
                $rootScope.$on('tick', function (event, payload) {
                    assert.isNumber(payload.hours);
                    assert.isNumber(payload.minutes);
                    assert.isNumber(payload.seconds);
                    done();
                });
            });
        });

        it('set', function (done) {
            ctimerService.set(5, function (err) {
                console.log('set finished', err);
                assert.notOk(err);
                console.log('getting');
                ctimerService.get(function (err, records) {
                    console.log('got', err, records);
                    assert.notOk(err);
                    assert.equal(records.seconds, 5);
                    done();
                });
            });
        });

        it('reset', function (done) {
            ctimerService.set(5, function (err) {
                assert.notOk(err);
                ctimerService.reset(function (err) {
                    console.debug('reset done', err);
                    assert.notOk(err);
                    ctimerService.get(function (err, records) {
                        console.debug('get done', records);
                        assert.notOk(err);
                        inject(function (TimerMode) {
                            assert.equal(records.seconds, 0);
                            assert.equal(records.currentRound, 1);
                            assert.equal(records.completedRounds, 0);
                            assert.equal(records.currentMode, TimerMode.Pomodoro);
                        });

                        done();
                    });
                });
            });
        });

        it('token', function (done) {
            assert.notOk(ctimerService._getToken());
            ctimerService.resume(function (err) {
                assert.notOk(err);
                assert.ok(ctimerService._getToken());
                ctimerService.pause(function (err) {
                    assert.notOk(err);
                    assert.notOk(ctimerService._getToken());
                    done();
                });
            });
        });
    });

    describe('pomodoro', function () {

        describe('short break', function () {

            beforeEach(reset);

            it('start', function (done) {
                ctimerService._inject({
                    seconds: (60 * 25) - 1,
                    currentRound: 1,
                    currentMode: TimerMode.Pomodoro,
                    completedRounds: 0
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function () {
                        $rootScope.$on('tick', function (e, payload) {
                            console.log('payload', payload);
                            try {
                                assert.equal(payload.hours, 0);
                                assert.equal(payload.minutes, 0);
                                assert.ok(payload.seconds == 0 || payload.seconds == 1);
                                assert.equal(payload.currentRound, 2);
                                assert.equal(payload.currentMode, TimerMode.ShortBreak);
                                assert.equal(payload.completedRounds, 1);
                                done();
                            }
                            catch (err) {done(err);}

                        });
                    });
                });
            });

            it('end', function (done) {
                ctimerService._inject({
                    seconds: (60 * 5) - 1,
                    currentRound: 2,
                    currentMode: TimerMode.ShortBreak,
                    completedRounds: 1
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function () {
                        $rootScope.$on('tick', function (e, payload) {
                            console.log('payload', payload);
                            try {
                                assert.equal(payload.hours, 0);
                                assert.equal(payload.minutes, 0);
                                assert.ok(payload.seconds == 0 || payload.seconds == 1);
                                assert.equal(payload.currentRound, 2);
                                assert.equal(payload.currentMode, TimerMode.Pomodoro);
                                assert.equal(payload.completedRounds, 1);
                                done();
                            }
                            catch (err) {done(err);}

                        });
                    });
                });
            });
        });

        describe('long break', function () {

            beforeEach(reset);

            it('start', function (done) {
                ctimerService._inject({
                    seconds: (60 * 25) - 1,
                    currentRound: 4,
                    currentMode: TimerMode.Pomodoro,
                    completedRounds: 3
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function () {
                        $rootScope.$on('tick', function (e, payload) {
                            console.log('payload', payload);
                            assert.equal(payload.hours, 0);
                            assert.equal(payload.minutes, 0);
                            assert.ok(payload.seconds == 0 || payload.seconds == 1);
                            assert.equal(payload.currentRound, 0);
                            assert.equal(payload.currentMode, TimerMode.LongBreak);
                            assert.equal(payload.completedRounds, 4);
                            done();
                        });
                    });
                });
            });

            it('end', function (done) {
                ctimerService._inject({
                    seconds: (60 * 15) - 1,
                    currentRound: 1,
                    currentMode: TimerMode.LongBreak,
                    completedRounds: 4
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function () {
                        $rootScope.$on('tick', function (e, payload) {
                            console.log('payload', payload);
                            assert.equal(payload.hours, 0);
                            assert.equal(payload.minutes, 0);
                            assert.ok(payload.seconds == 0 || payload.seconds == 1);
                            assert.equal(payload.currentRound, 1);
                            assert.equal(payload.currentMode, TimerMode.Pomodoro);
                            assert.equal(payload.completedRounds, 4);
                            done();
                        });
                    });
                });
            });

        });

        describe('set', function () {
            beforeEach(reset);

            it('above current time', function (done) {
                var twentyThreeMinutes = (60 * 23);
                var twentyFiveMinutes = (60 * 25);
                ctimerService._inject({
                    seconds: twentyThreeMinutes,
                    currentRound: 1,
                    currentMode: TimerMode.Pomodoro,
                    completedRounds: 0
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function (err) {
                        assert.notOk(err);
                        ctimerService.set(twentyFiveMinutes, function (err) {
                            assert.notOk(err);
                            ctimerService.get(function (err, records) {
                                console.log('get:', records);
                                try {
                                    assert.notOk(err);
                                    assert.equal(records.currentRound, 2, 'Should have been forced to next round');
                                    assert.equal(records.currentMode, TimerMode.ShortBreak, 'Should have forced to Short Break');
                                    assert.equal(records.completedRounds, 1);
                                    done();
                                }
                                catch (err) { done(err); }
                            });

                        });
                    });
                });
            });

            it('below current time', function (done) {
                var twentyThreeMinutes = (60 * 23);
                var twentyMinutes = (60 * 20);
                ctimerService._inject({
                    seconds: twentyThreeMinutes,
                    currentRound: 1,
                    currentMode: TimerMode.Pomodoro,
                    completedRounds: 0
                }, function (err) {
                    console.log('_inject returned:', err);
                    assert.notOk(err);
                    ctimerService.resume(function (err) {
                        assert.notOk(err);
                        ctimerService.set(twentyMinutes, function (err) {
                            assert.notOk(err);
                            ctimerService.get(function (err, records) {
                                console.log('get:', records);
                                try {
                                    assert.notOk(err);
                                    assert.equal(records.currentRound, 1, 'Should be same round');
                                    assert.equal(records.currentMode, TimerMode.Pomodoro, 'Should be same mode');
                                    assert.equal(records.completedRounds, 0);
                                    done();
                                }
                                catch (err) { done(err); }
                            });

                        });
                    });
                });
            });

        });

        describe('settings change', function () {

            /**
             * Test that a change in a particular setting has the right effect on the pomodoro variables
             * within the timer.
             * @param opts
             * @param done
             */
            function testChangeInSetting(opts, done) {
                ctimerService._inject(opts.startRecords, function (err) {
                    console.log('_inject returned:', err);
                    if (err) done(err);
                    ctimerService.resume(function (err) {
                        if (err) done(err);
                        Settings.set(opts.setting.key, opts.setting.newValue, function (err) {
                            if (err) done(err);
                            ctimerService.get(function (err, records) {
                                if (err) done(err);
                                try {
                                    $rootScope.$apply(); // Call watch methods
                                    assert.equal($rootScope.settings[opts.setting.key],
                                        opts.setting.newValue);
                                    assert.equal(records.currentRound,
                                        opts.expectations.expectedCurrentRound);
                                    assert.equal(records.currentMode,
                                        opts.expectations.expectedMode);
                                    assert.equal(records.completedRounds, opts.expectations.expectedCompletedRounds);
                                    done();
                                }
                                catch (err) {
                                    done(err);
                                }
                            });
                        });
                    });
                });
            }

            describe('change in length of pomodoro', function () {
                beforeEach(reset);
                it('below current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 23),
                            currentRound: 1,
                            currentMode: TimerMode.Pomodoro,
                            completedRounds: 0
                        },
                        setting: {
                            key: 'pomodoroLength',
                            newValue: 20
                        },
                        expectations: {
                            expectedCompletedRounds: 1,
                            expectedMode: TimerMode.ShortBreak,
                            expectedCurrentRound: 2
                        }
                    }, done);
                });

                it('above current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 23),
                            currentRound: 1,
                            currentMode: TimerMode.Pomodoro,
                            completedRounds: 0
                        },
                        setting: {
                            key: 'pomodoroLength',
                            newValue: 40
                        },
                        expectations: {
                            expectedCompletedRounds: 0,
                            expectedMode: TimerMode.Pomodoro,
                            expectedCurrentRound: 1
                        }
                    }, done);
                });
            });

            describe('change in length of short break', function () {
                beforeEach(reset);
                it('below current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 4),
                            currentRound: 2,
                            currentMode: TimerMode.ShortBreak,
                            completedRounds: 1
                        },
                        setting: {
                            key: 'pomodoroShortBreak',
                            newValue: 3
                        },
                        expectations: {
                            expectedCompletedRounds: 1,
                            expectedMode: TimerMode.Pomodoro,
                            expectedCurrentRound: 2
                        }
                    }, done);
                });

                it('above current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 4),
                            currentRound: 2,
                            currentMode: TimerMode.ShortBreak,
                            completedRounds: 1
                        },
                        setting: {
                            key: 'pomodoroShortBreak',
                            newValue: 6
                        },
                        expectations: {
                            expectedCompletedRounds: 1,
                            expectedMode: TimerMode.ShortBreak,
                            expectedCurrentRound: 2
                        }
                    }, done);
                });
            });

            describe('change in length of long break', function () {
                beforeEach(reset);
                it('below current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 13),
                            currentRound: 1,
                            currentMode: TimerMode.LongBreak,
                            completedRounds: 4
                        },
                        setting: {
                            key: 'pomodoroLongBreak',
                            newValue: 10
                        },
                        expectations: {
                            expectedCompletedRounds: 4,
                            expectedMode: TimerMode.Pomodoro,
                            expectedCurrentRound: 1
                        }
                    }, done);
                });
                it('above current time', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 13),
                            currentRound: 1,
                            currentMode: TimerMode.LongBreak,
                            completedRounds: 4
                        },
                        setting: {
                            key: 'pomodoroLongBreak',
                            newValue: 20
                        },
                        expectations: {
                            expectedCompletedRounds: 4,
                            expectedMode: TimerMode.LongBreak,
                            expectedCurrentRound: 1
                        }
                    }, done);
                });
            });

            describe('change in number of rounds', function () {
                beforeEach(reset);
                it('above current', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 13),
                            currentRound: 4,
                            currentMode: TimerMode.Pomodoro,
                            completedRounds: 4
                        },
                        setting: {
                            key: 'pomodoroRounds',
                            newValue: 10
                        },
                        expectations: {
                            expectedCompletedRounds: 4,
                            expectedMode: TimerMode.Pomodoro,
                            expectedCurrentRound: 4
                        }
                    }, done);
                });
                it('below current', function (done) {
                    testChangeInSetting({
                        startRecords: {
                            seconds: (60 * 13),
                            currentRound: 4,
                            currentMode: TimerMode.Pomodoro,
                            completedRounds: 4
                        },
                        setting: {
                            key: 'pomodoroRounds',
                            newValue: 2
                        },
                        expectations: {
                            expectedCompletedRounds: 4,
                            expectedMode: TimerMode.LongBreak,
                            expectedCurrentRound: 1
                        }
                    }, done);
                });
            });


        })

    });
});