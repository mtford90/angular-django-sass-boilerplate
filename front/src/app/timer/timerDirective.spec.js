describe('ctimer', function () {
    var $rootScope, ctimerService, TimerMode, Settings, $compile;

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

    beforeEach(function () {
        module('ctimer', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q);

        });

        inject(function (_$rootScope_, _ctimerService_, _TimerMode_, _Settings_, _$compile_) {
            $rootScope = _$rootScope_;
            ctimerService = _ctimerService_;
            TimerMode = _TimerMode_;
            Settings = _Settings_;
            $compile = _$compile_;

        });
    });

    describe('timer without controls', function () {
        beforeEach(reset);
        it.only('hours, minutes and seconds', function (done) {
            Settings.set('pomodoroLength', 70, function (err) {
                if (err) done(err);
                ctimerService._inject({
                    seconds: 50,
                    currentRound: 1,
                    currentMode: TimerMode.Pomodoro,
                    completedRounds: 0
                }, function (err) {
                    if (err) done(err);
                    ctimerService.resume(function (err) {
                        if (err) done(err);
                        var scope = $rootScope.$new();
                        var element = '<div ctimerd></div>';
                        element = $compile(element)(scope);
                        scope.$digest();
                        try {
                            assert.equal('01', element.find('.hours').text());
                            assert.equal('09', element.find('.minutes').text());
                            assert.equal('10', element.find('.seconds').text());
                        }
                        catch (err) {
                            done(err);
                        }
                        $rootScope.$digest();
                        scope.$digest();

                        $rootScope.$on('tick', function (e, payload) {
                            scope.$digest();
                            console.log('element:', element);
                            try {
                                assert.equal('01', element.find('.hours').text());
                                assert.equal('09', element.find('.minutes').text());
                                assert.equal('09', element.find('.seconds').text());
                                done();
                            }
                            catch (err) {
                                done(err);
                            }

                        });
                        $rootScope.$digest();
                        scope.$digest();

                    });
                });
            });
        });

        it('minutes and seconds', function (done) {
            ctimerService._inject({
                seconds: 50,
                currentRound: 1,
                currentMode: TimerMode.Pomodoro,
                completedRounds: 0
            }, function (err) {
                if (err) done(err);
                ctimerService.resume(function (err) {
                    if (err) done(err);
                    $rootScope.$digest();
                    $rootScope.$on('tick', function (e, payload) {
                        var scope = $rootScope.$new();
                        var element = '<div ctimerd></div>';
                        element = $compile(element)(scope);
                        scope.$digest();
                        console.log('element:', element);
                        try {
                            assert.notOk(element.find('.hours').length);
                            assert.equal(24, parseInt(element.find('.minutes').text(), 10));
                            assert.equal('09', element.find('.seconds').text());
                            done();
                        }
                        catch (err) {
                            done(err);
                        }

                    });
                });
            });
        });


        it('seconds', function (done) {
            ctimerService._inject({
                seconds: (24 * 60) + 30,
                currentRound: 1,
                currentMode: TimerMode.Pomodoro,
                completedRounds: 0
            }, function (err) {
                if (err) done(err);
                ctimerService.resume(function (err) {
                    if (err) done(err);
                    $rootScope.$digest();
                    $rootScope.$on('tick', function (e, payload) {
                        var scope = $rootScope.$new();
                        var element = '<div ctimerd></div>';
                        element = $compile(element)(scope);
                        scope.$digest();
                        console.log('element:', element);
                        try {
                            assert.notOk(element.find('.hours').length);
                            assert.equal('00', element.find('.minutes').text());
                            assert.equal('29', element.find('.seconds').text());
                            done();
                        }
                        catch (err) {
                            done(err);
                        }
                    });
                });
            });
        });
    });

    describe('timer with controls', function () {
        beforeEach(reset);
        it('renders inner timer correctly', function (done) {
            ctimerService._inject({
                seconds: 50,
                currentRound: 1,
                currentMode: TimerMode.Pomodoro,
                completedRounds: 0
            }, function (err) {
                if (err) done(err);
                ctimerService.resume(function (err) {
                    if (err) done(err);
                    $rootScope.$digest();
                    var scope = $rootScope.$new();
                    var element = '<div timer-with-controls></div>';
                    element = $compile(element)(scope);
                    scope.$digest();
                    console.log('element:', element);
                    try {
                        // Check that the inner timer directive has rendered correctly.
                        assert.notOk(element.find('.hours').length);
                        assert.equal(24, parseInt(element.find('.minutes').text(), 10));
                        assert.equal('10', element.find('.seconds').text());
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                });
            });
        });

        it('renders play/pause button correctly', function (done) {
            ctimerService._inject({
                seconds: 50,
                currentRound: 1,
                currentMode: TimerMode.Pomodoro,
                completedRounds: 0
            }, function (err) {
                if (err) done(err);
                $rootScope.$digest();
                var scope = $rootScope.$new();
                var element = '<div timer-with-controls></div>';
                element = $compile(element)(scope);
                scope.$digest();
                console.log('element:', element);
                try {
                    assert.ok(element.find('.play-or-pause-button').hasClass('fa-play'), 'should display play when paused');
                }
                catch (err) { done(err); }
                ctimerService.resume(function (err) {
                    if (err) done(err);
                    try {
                        scope.$digest();
                        assert.ok(element.find('.play-or-pause-button').hasClass('fa-pause'), 'should display pause when playing');
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                });
            });
        });

        it('play button works', function (done) {
            ctimerService._inject({
                seconds: 50,
                currentRound: 1,
                currentMode: TimerMode.Pomodoro,
                completedRounds: 0
            }, function (err) {
                if (err) done(err);
                $rootScope.$digest();
                var scope = $rootScope.$new();
                var element = '<div timer-with-controls></div>';
                element = $compile(element)(scope);
                scope.$digest();
                try {
                    var ctimerService_resume = sinon.spy(ctimerService, "resume");
                    element.find('.play-or-pause-button').click();
                    assert.ok(ctimerService_resume.calledOnce);
                    ctimerService.resume.restore();
                }
                catch (err) {
                    done(err);
                }
                ctimerService.resume(function (err) {
                    if (err) done(err);
                    try {
                        var ctimerService_pause = sinon.spy(ctimerService, "pause");
                        element.find('.play-or-pause-button').click();
                        assert.ok(ctimerService_pause.calledOnce);
                        ctimerService.pause.restore();
                        done();
                    }
                    catch (err) {
                        done(err);
                    }
                });


            });
        });

    });

});