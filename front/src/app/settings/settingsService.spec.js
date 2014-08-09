describe('app.settings.settings-service', function () {
    var $rootScope, $q;

    beforeEach(function (done) {
        module('app.settings', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });
        inject(function (_$q_, _$rootScope_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
            clearStorage().then(done, done);
        });
    });

    describe.only('map/reduce', function () {
        var map;

        /**
         * Reconstruct map function so can capture emissions.
         * @returns {Array}
         */
        function configureMapFunction() {
            var emissions = [];
            inject(function (SETTINGS_MAP_REDUCE) {
                //noinspection JSUnusedLocalSymbols
                var emit = function (id, doc) {
                    emissions.push({key: id, value: doc});
                };
                map = SETTINGS_MAP_REDUCE.index.map;
                eval('map = ' + map.toString());
            });
            return emissions;
        }

        it('map', function () {
            var emissions = configureMapFunction();
            map({type: 'setting'});
            map({type: 'adasd'});
            assert.equal(1, emissions.length);
            assert.equal(emissions[0].value.type, 'setting');
        });

        it('rereduce', function () {
            inject(function (SETTINGS_MAP_REDUCE) {
                var reduce = SETTINGS_MAP_REDUCE.index.reduce;
                var res = reduce(undefined, [
                    {
                        blah: {
                            value: 5,
                            ts: 50
                        },
                        blah2: {
                            value: 10,
                            ts: 12
                        }
                    },
                    {
                        blah: {
                            value: 10,
                            ts: 5
                        }
                    }
                ], true);
                assert.equal(5, res.blah.value);
                assert.equal(10, res.blah2.value);
            });
        });

    });

    it('test set', function (done) {
        inject(function (SettingsService) {
            SettingsService.set('blah', 'asdas', function (err) {
                assert.notOk(err);
                SettingsService.getAll(function (err, settings) {
                    assert.notOk(err);
                    assert.equal('asdas', settings.blah);
                    SettingsService.get('blah', function (err, value) {
                        assert.notOk(err);
                        assert.equal('asdas', value);
                    });
                    done();
                });
            });
        });
    });

    it('test set again', function (done) {
        inject(function (SettingsService) {
            SettingsService.set('blah', 'asdas', function (err) {
                assert.notOk(err);
                SettingsService.set('blah', '123', function (err) {
                    assert.notOk(err);
                    SettingsService.get('blah', function (err, value) {
                        assert.notOk(err);
                        assert.equal('123', value);
                        done();
                    });
                });
            });
        });
    });

    it('test set multiple', function (done) {
        inject(function (SettingsService) {
            SettingsService.set('blah', 'asdas', function (err) {
                assert.notOk(err);
                SettingsService.set('blah2', '123', function (err) {
                    assert.notOk(err);
                    SettingsService.set('blah3', 'sdfsd34', function (err) {
                        assert.notOk(err);
                        SettingsService.getAll(function (err, settings) {
                            assert.notOk(err);
                            assert.equal('asdas', settings['blah']);
                            assert.equal('123', settings['blah2']);
                            assert.equal('sdfsd34', settings['blah3']);
                            done();
                        });
                    });
                });
            });
        });
    });


});