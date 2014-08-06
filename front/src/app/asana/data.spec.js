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

    describe('Tasks', function () {
        var tasks;
        var err;

        // Here we just want to get the PouchDB back to it's initial state before each test is run.
        beforeEach(inject(function (lazyPouchDB) {
            tasks = undefined;
            err = undefined;
            reset(lazyPouchDB);
        }));

        function getTasks() {
            inject(function (AsanaDataAccessLocal) {
                runs(function () {
                    AsanaDataAccessLocal.getTasks().then(function (_tasks) {
                        tasks = _tasks;
                    }, function (e) {
                        err = e;
                    });
                });
                waitsFor(function () {
                    // Promises only complete on angular $digests.
                    $rootScope.$apply();
                    return (tasks || tasks == []) || err;
                }, 'the PouchDB instance promise to return tasks', 1000);
            });
        }

        function addTask(id, name) {
            inject(function (AsanaDataAccessLocal) {
                var added = false;
                var err;
                runs(function () {
                    AsanaDataAccessLocal.addTask({
                        id: id,
                        name: name,
                        source: 'asana'
                    }).then(function () {
                        added = true;
                    }, function (_err) {
                        err = _err;
                    });
                });
                waitsFor(function () {
                    $rootScope.$apply();
                    return (added || err);
                }, 'the PouchDB promise to add the task', 1000);
                runs(function () {

                    expect(added).toBeTruthy();
                    expect(err).toBeFalsy();
                });
            });
        }

        function removeTask(task) {
            inject(function (AsanaDataAccessLocal) {
                var removed = false;
                var err;
                runs(function () {
                    AsanaDataAccessLocal.removeTask(task).then(function () {
                        removed = true;
                    }, function (_err) {
                        err = _err;
                    });
                });
                waitsFor(function () {
                    $rootScope.$apply();
                    return (removed || err);
                }, 'the PouchDB promise to remove the task', 1000);
                runs(function () {
                    expect(removed).toBeTruthy();
                    expect(err).toBeFalsy();
                });
            });
        }

        function clearTasks() {
            inject(function (AsanaDataAccessLocal) {
                var cleared = false;
                var err;
                runs(function () {
                    AsanaDataAccessLocal.clearTasks().then(function () {
                        cleared = true;
                    }, function (_err) {
                        err = _err;
                    });
                });
                waitsFor(function () {
                    $rootScope.$apply();
                    return (cleared || err);
                }, 'the PouchDB promise to clear tasks', 1000);
                runs(function () {
                    expect(cleared).toBeTruthy();
                    expect(err).toBeFalsy();
                });
            });
        }

        it('should return [] if no tasks', inject(function () {
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks).toEqual([]);
            });
        }));


        it('should return the task if added one task', inject(function () {
            runs(function () {
                addTask('5', 'a task');
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(1);
                expect(tasks[0].name).toEqual('a task');
                expect(tasks[0].id).toEqual('5');
                expect(tasks[0]._id).toEqual('5');
                expect(tasks[0].type).toEqual('task');
            });
        }));

        it('should return the task if added multiple tasks', inject(function () {
            runs(function () {
                addTask('5', 'a task');
                addTask('6', 'a second task');
                addTask('7', 'a third task');
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(3);
                var idents = _.pluck(tasks, 'id');
                expect(idents).toContain('5');
                expect(idents).toContain('6');
                expect(idents).toContain('7');
            });
        }));

        it('should return all tasks minus the removed task when removed (object)', inject(function () {
            runs(function () {
                addTask('5', 'a task');
                addTask('6', 'a second task');
                addTask('7', 'a third task');
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(3);
                var taskToRemove = tasks[0];
                tasks = undefined;
                err = undefined;
                removeTask(taskToRemove);
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(2);
                var idents = _.pluck(tasks, 'id');
                expect(idents).toContain('6');
                expect(idents).toContain('7');
            });
        }));


        it('should return no tasks if cleared', inject(function () {
            runs(function () {
                addTask('5', 'a task');
                addTask('6', 'a second task');
                addTask('7', 'a third task');
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(3);
                tasks = undefined;
                err = undefined;
                clearTasks();
            });
            getTasks();
            runs(function () {
                expect(err).toBeFalsy();
                expect(tasks.length).toEqual(0);
            });
        }));

    });

});

