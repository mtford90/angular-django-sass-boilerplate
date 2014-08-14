describe.only('ctimer', function () {
    var $rootScope, ctimerService, TimerMode;

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

        inject(function (_$rootScope_, _ctimerService_, _TimerMode_) {
            $rootScope = _$rootScope_;
            ctimerService = _ctimerService_;
            TimerMode = _TimerMode_;
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


    });
});