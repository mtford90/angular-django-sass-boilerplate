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

    describe('User', function () {
        var instance;
        var err;

        // Here we just want to get the PouchDB back to it's initial state before each test is run.
        beforeEach(inject(function (lazyPouchDB) {
            instance = undefined;
            err = undefined;
            reset(lazyPouchDB);
        }));

        /**
         * Calls the getUser method of the local Asana service and populates instance and err
         * depending on what happens.
         */
        function getUser() {
            inject(function (AsanaDataAccessLocal) {
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
                    return (instance || instance === null) || err;
                }, 'the PouchDB instance promise to return a user', 1000);
            });
        }

        /**
         * Create a fake user object and place it into our PouchDB instance. Waits for it to finish via
         * promise.
         */
        function injectUser(name, id) {
            name = name || 'Michael Ford';
            id = id || 'fakeid';
            var done;
            var err;
            inject(function (AsanaDataAccessLocal) {
                runs(function () {
                    AsanaDataAccessLocal.setActiveUser({
                        name: name,
                        id: id
                    }).then(function () {
                        done = true;
                    }, function (_err) {
                        done = true;
                        err = _err;
                    });
                });
                waitsFor(function () {
                    $rootScope.$apply();
                    return (done || err);
                }, 'injection of mock user to succeed', 1000);
                runs(function () {
                    expect(err).toBeFalsy();
                    expect(done).toBeTruthy();
                });
            });
        }

        it('should return null if no user', inject(function () {
            getUser();
            runs(function () {
                expect(err).toBeFalsy();
                expect(instance).toBeNull();
            });
        }));

        it('should return a user if one exists', function () {
            injectUser();
            getUser();
            runs(function () {
                expect(err).toBeFalsy();
                expect(instance).toBeTruthy();
            });
        });

        it('should update existing user', function () {
            injectUser();
            getUser();
            runs(function () {
                expect(err).toBeFalsy();
                expect(instance).toBeTruthy();
            });
            injectUser('blah', 'blah');
            runs(function () {
                err = undefined;
                instance = undefined;
            });
            getUser();
            runs(function () {
                console.log('instance is', instance);
                expect(err).toBeFalsy();
                expect(instance.name).toEqual('blah');
                expect(instance.id).toEqual('blah');
            });
        });

    });

});

