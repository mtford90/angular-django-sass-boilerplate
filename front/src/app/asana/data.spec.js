describe('app.asana.data', function () {

    var $rootScope, $q;

    beforeEach(function (done) {
        module('app.asana.data', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });

        inject(function (_$q_, _$rootScope_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
        });

        // Reset database
        inject(function (lazyPouchDB) {
            lazyPouchDB.reset().then(function () {
                console.log('reset succeeded');
                done();
            }, function (e) {
                console.error('reset failed', e);
                done(e);
            });
        });
    });

    describe('User', function () {
        var AsanaDataAccessLocal;

        // Here we just want to get the PouchDB back to it's initial state before each test is run.
        beforeEach(inject(function (_AsanaDataAccessLocal_) {
            AsanaDataAccessLocal = _AsanaDataAccessLocal_;
        }));

        function injectUser(name, id) {
            console.log('injectUser');
            name = name || 'Michael Ford';
            id = id || 'fakeid';
            return AsanaDataAccessLocal.setActiveUser({
                name: name,
                id: id
            });
        }

//        it('should return null if no user', function (done) {
//            var getUserPromise = AsanaDataAccessLocal.getUser();
//            getUserPromise.then(function (user) {
//                console.log('got user:', user);
//                if (user == null) {
//                    done();
//                }
//                else {
//                    done(new Error('user not null'));
//                }
//            }, mochaError(done));
//        });
//
//        it('should return a user if one exists', function (done) {
//            inject(function (AsanaDataAccessLocal) {
//                injectUser().then(function () {
//                    console.debug('injectUser success');
//                    AsanaDataAccessLocal.getUser().then(function (user) {
//                        assert.ok(user);
//                        done();
//                    }, mochaError(done));
//                }, mochaError(done));
//            });
//
//        });
//
//        it('should update existing user', function () {
//            injectUser();
//            getUser();
//            runs(function () {
//                expect(getUserError).toBeFalsy();
//                expect(user).toBeTruthy();
//            });
//            injectUser('blah', 'blah');
//            runs(function () {
//                getUserError = undefined;
//                user = undefined;
//            });
//            getUser();
//            runs(function () {
//                console.log('instance is', user);
//                expect(getUserError).toBeFalsy();
//                expect(user.name).toEqual('blah');
//                expect(user.id).toEqual('blah');
//            });
//        });

    });
//
//    describe('Tasks', function () {
//        var tasks;
//        var err;
//
//        // Here we just want to get the PouchDB back to it's initial state before each test is run.
//        beforeEach(inject(function (lazyPouchDB) {
//            tasks = undefined;
//            err = undefined;
//        }));
//
//        function getTasks() {
//            inject(function (AsanaDataAccessLocal) {
//                runs(function () {
//                    AsanaDataAccessLocal.getTasks().then(function (_tasks) {
//                        tasks = _tasks;
//                    }, function (e) {
//                        err = e;
//                    });
//                });
//                waitsFor(function () {
//                    // Promises only complete on angular $digests.
//                    $rootScope.$apply();
//                    return (tasks || tasks == []) || err;
//                }, 'the PouchDB instance promise to return tasks', 1000);
//            });
//        }
//
//        function addTask(id, name) {
//            inject(function (AsanaDataAccessLocal) {
//                var added = false;
//                var err;
//                runs(function () {
//                    AsanaDataAccessLocal.addTask({
//                        id: id,
//                        name: name,
//                        source: 'asana'
//                    }).then(function () {
//                        added = true;
//                    }, function (_err) {
//                        err = _err;
//                    });
//                });
//                waitsFor(function () {
//                    $rootScope.$apply();
//                    return (added || err);
//                }, 'the PouchDB promise to add the task', 1000);
//                runs(function () {
//
//                    expect(added).toBeTruthy();
//                    expect(err).toBeFalsy();
//                });
//            });
//        }
//
//        function removeTask(task) {
//            inject(function (AsanaDataAccessLocal) {
//                var removed = false;
//                var err;
//                runs(function () {
//                    AsanaDataAccessLocal.removeTask(task).then(function () {
//                        removed = true;
//                    }, function (_err) {
//                        err = _err;
//                    });
//                });
//                waitsFor(function () {
//                    $rootScope.$apply();
//                    return (removed || err);
//                }, 'the PouchDB promise to remove the task', 1000);
//                runs(function () {
//                    expect(removed).toBeTruthy();
//                    expect(err).toBeFalsy();
//                });
//            });
//        }
//
//        function clearTasks() {
//            inject(function (AsanaDataAccessLocal) {
//                var cleared = false;
//                var err;
//                runs(function () {
//                    AsanaDataAccessLocal.clearTasks().then(function () {
//                        cleared = true;
//                    }, function (_err) {
//                        err = _err;
//                    });
//                });
//                waitsFor(function () {
//                    $rootScope.$apply();
//                    return (cleared || err);
//                }, 'the PouchDB promise to clear tasks', 1000);
//                runs(function () {
//                    expect(cleared).toBeTruthy();
//                    expect(err).toBeFalsy();
//                });
//            });
//        }
//
//        it('should return [] if no tasks', inject(function () {
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks).toEqual([]);
//            });
//        }));
//
//
//        it('should return the task if added one task', inject(function () {
//            runs(function () {
//                addTask('5', 'a task');
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(1);
//                expect(tasks[0].name).toEqual('a task');
//                expect(tasks[0].id).toEqual('5');
//                expect(tasks[0]._id).toEqual('5');
//                expect(tasks[0].type).toEqual('task');
//            });
//        }));
//
//        it('should return the task if added multiple tasks', inject(function () {
//            runs(function () {
//                addTask('5', 'a task');
//                addTask('6', 'a second task');
//                addTask('7', 'a third task');
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(3);
//                var idents = _.pluck(tasks, 'id');
//                expect(idents).toContain('5');
//                expect(idents).toContain('6');
//                expect(idents).toContain('7');
//            });
//        }));
//
//        it('should return all tasks minus the removed task when removed (object)', inject(function () {
//            runs(function () {
//                addTask('5', 'a task');
//                addTask('6', 'a second task');
//                addTask('7', 'a third task');
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(3);
//                var taskToRemove = tasks[0];
//                tasks = undefined;
//                err = undefined;
//                removeTask(taskToRemove);
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(2);
//                var idents = _.pluck(tasks, 'id');
//                expect(idents).toContain('6');
//                expect(idents).toContain('7');
//            });
//        }));
//
//
//        it('should return no tasks if cleared', inject(function () {
//            runs(function () {
//                addTask('5', 'a task');
//                addTask('6', 'a second task');
//                addTask('7', 'a third task');
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(3);
//                tasks = undefined;
//                err = undefined;
//                clearTasks();
//            });
//            getTasks();
//            runs(function () {
//                expect(err).toBeFalsy();
//                expect(tasks.length).toEqual(0);
//            });
//        }));
//
//    });

});

