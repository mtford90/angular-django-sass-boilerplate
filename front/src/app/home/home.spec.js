describe('app.home', function () {

    var $rootScope;



    beforeEach(function (done) {
        module('app.home', function ($provide) {
            $provide.value('$log', console);
        });

        inject(function (_$rootScope_) {
            $rootScope = _$rootScope_;
        });

//        clearStorage().then(done, done);
        done();
    });

    it('sdasd', function (){

    });

});
