describe('data.LazyPouchDB', function () {

    var $rootScope, $q;

    beforeEach(function () {
        module('app.asana.data', function ($provide) {
            $provide.value('$log', console);
        });
        inject(function (_$q_, _$rootScope_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
        });
    });

    /**
     * Reset PouchDB and wait for said reset to finish, failing the test if anything goes
     * wrong.
     * @param lazyPouchDB service
     */
    function reset(lazyPouchDB) {

        var didReset = false;
        var didFail = false;
        runs(function () {
            lazyPouchDB.reset().then(function () {
                console.log('reset succeeded');
                didReset = true;
            }, function (e) {
                console.error('reset failed', e);
                didFail = true;
            });
        });
        waitsFor(function () {
            $rootScope.$apply();
            return didReset || didFail;
        }, 'the PouchDB instance to be reset', 1000);
        runs(function () {
            console.log('Confirming that reset has succeeded');
            expect(didFail).toBeFalsy();
            expect(didReset).toBeTruthy();
        });
    }

    it('should return a pouchdb instance eventually', inject(function (lazyPouchDB) {
        var instance = null;
        var err = null;
        reset(lazyPouchDB);
        runs(function () {
            var promise = lazyPouchDB.promise;
            dump(promise);
            promise.then(function (i) {
                console.log('Promise succeeded', i);
                instance = i;
            }, function (e) {
                console.log('Promise failed', e);
                err = e;
            });
        });
        waitsFor(function () {
            // Promises only complete on angular $digests.
            $rootScope.$apply();
            return instance || err;
        }, 'the PouchDB instance promise to return', 1000);
        runs(function () {
            expect(err).toBeFalsy();
            expect(instance).toBeTruthy();
            instance = null;
            err = null;
            // Try it again to check that promises work as expected.
            // Any subsequent requests should defer immediately.
            var promise = lazyPouchDB.promise;
            promise.then(function (i) {
                console.log('Promise succeeded', i);
                instance = i;
            }, function (e) {
                console.log('Promise failed', e);
                err = e;
            });
        });
        waitsFor(function () {
            // Promises only complete on angular $digests.
            $rootScope.$apply();
            return instance || err;
        }, 'the PouchDB instance promise to return a subsequent time', 1000);
        runs(function () {
            expect(err).toBeFalsy();
            expect(instance).toBeTruthy();
        });
    }));

    it('should return a user object', inject(function (AsanaDataAccessLocal, lazyPouchDB) {
        var instance = null;
        var err = null;
        reset(lazyPouchDB);
        runs(function () {
            AsanaDataAccessLocal.getUser().then(function (user) {
                instance = user;
            }, function (e) {
                err = e;
            });
        });
        waitsFor(function () {
            // Promises only complete on angular $digests.
            $rootScope.$apply();
            return instance || err;
        }, 'the PouchDB instance promise to return a user', 1000);
        runs(function () {
            expect(err).toBeFalsy();
            expect(instance).toBeTruthy();
        });
    }));


});

