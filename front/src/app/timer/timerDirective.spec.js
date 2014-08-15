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

    beforeEach(function (done) {
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
        reset(done);

    });

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
                    $rootScope.$digest();
                    $rootScope.$on('tick', function (e, payload) {
                        var scope = $rootScope.$new();
                        var element = '<div ctimerd></div>';
                        element = $compile(element)(scope);
                        scope.$digest();
                        console.log('element:',element);
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
                    console.log('element:',element);
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
                    console.log('element:',element);
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