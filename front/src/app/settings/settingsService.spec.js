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

    it.only('x', function (done) {
        done();
    });


});