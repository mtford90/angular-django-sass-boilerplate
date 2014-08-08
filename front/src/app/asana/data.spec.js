describe('app.asana.data', function () {

    var $rootScope, $q;

    beforeEach(function (done) {
        this.timeout(10000);
        module('app.asana.data', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });

        inject(function (_$q_, _$rootScope_, lazyPouchDB) {
            $q = _$q_;
            $rootScope = _$rootScope_;
            done();
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

        it('should return null if no user', function (done) {
            var getUserPromise = AsanaDataAccessLocal.getUser();
            getUserPromise.then(function (user) {
                console.log('got user:', user);
                if (user == null) {
                    done();
                }
                else {
                    done(new Error('user not null'));
                }
            }, mochaError(done));
        });

        it('should return a user if one exists', function (done) {
            inject(function (AsanaDataAccessLocal) {
                injectUser().then(function () {
                    console.debug('injectUser success');
                    AsanaDataAccessLocal.getUser().then(function (user) {
                        assert.ok(user);
                        done();
                    }, mochaError(done));
                }, mochaError(done));
            });
        });

        it('should update existing user', function () {
            inject(function (AsanaDataAccessLocal) {
                async.waterfall([
                    function (callback) {
                        injectUser().then(_.partial(callback, null), callback);
                    },
                    function (callback) {
                        AsanaDataAccessLocal.getUser().then(function (user) {
                            var err;
                            if (!user) {
                                err = 'no user returned';
                            }
                            callback(err, user);
                        }, callback);
                    },
                    function (callback) {
                        injectUser('blah', 'blah').then(_.partial(callback, null), callback);
                    },
                    function (callback) {
                        AsanaDataAccessLocal.getUser().then(function (user) {
                            var err;
                            // TODO: For some reason async.js hides AssertionErrors
                            try {
                                assert.equals(user.name, 'blah');
                                assert.equals(user.id, 'blah');
                            }
                            catch (e) {
                                err = e;
                            }
                            callback(err, user);
                        }, callback);
                    }
                ], function (err) {
                    if (err) {
                        done(new Error(err));
                    }
                });
            });
        });
    });


    describe('Tasks', function () {

        it.only('should return [] if no tasks', function (done) {
            inject(function (AsanaDataAccessLocal) {
                AsanaDataAccessLocal.getTasks().then(function (tasks) {
                    console.log('got tasks', tasks);
                    assert.equal(0, tasks.length);
                    done();
                }, mochaError(done));
            });
        });
//
//        it('should return the task if added one task', function (done) {
//            inject(function (AsanaDataAccessLocal) {
//                async.waterfall([
//                        function (callback) {
//                            AsanaDataAccessLocal.addTask({
//                                id: '5',
//                                name: 'a task'
//                            }).then(function (resp) {
//                                callback(null, resp);
//                            }, callback);
//                        },
//                        function (addTaskResponse, callback) {
//                            AsanaDataAccessLocal.getTasks().then(function (tasks) {
//                                callback(null, tasks);
//                            }, callback);
//                        }
//                    ],
//                    function (err, tasks) {
//                        if (err) {
//                            done(err);
//                        }
//                        // TODO: For some reason async.js hides AssertionErrors
//                        try {
//                            assert.equal(tasks.length, 1, 'should now be one task');
//                            assert.equal(tasks[0].name, 'a task');
//                            assert.equal(tasks[0].id, '5');
//                            assert.equal(tasks[0]._id, '5');
//                            assert.equal(tasks[0].type, 'task');
//                            done();
//                        }
//                        catch (err) {
//                            done(new Error(err));
//                        }
//                    });
//            });
//        });
//
//        it('should return the task if added multiple tasks', function (done) {
//            inject(function (AsanaDataAccessLocal) {
//
//                function addTask(task, callback) {
//                    AsanaDataAccessLocal.addTask(task).then(function () {
//                        callback();
//                    }, callback);
//                }
//
//                async.waterfall([
//                        _.partial(addTask, {id: '5', name: 'a task'}),
//                        _.partial(addTask, {id: '6', name: 'a second task'}),
//                        _.partial(addTask, {id: '7', name: 'a third task'}),
//                        function (callback) {
//                            AsanaDataAccessLocal.getTasks().then(_.partial(callback, null), callback);
//                        }
//                    ],
//                    function (err, tasks) {
//                        if (err) {
//                            done(err);
//                        }
//                        // TODO: For some reason async.js hides AssertionErrors
//                        try {
//                            assert.equal(tasks.length, 3, 'should now be three tasks');
//                            done();
//                        }
//                        catch (err) {
//                            done(new Error(err));
//                        }
//                    });
//            });
//        });
//
//        it('should return all tasks minus the removed task when removed', function (done) {
//            inject(function (AsanaDataAccessLocal) {
//
//                function addTask(task, tasks, callback) {
//                    AsanaDataAccessLocal.addTask(task).then(function (resp) {
//                        task._rev = resp.rev;
//                        task._id = resp.id;
//                        tasks.push(task);
//                        callback(null, tasks);
//                    }, callback);
//                }
//
//                async.waterfall(
//                    [
//                        _.partial(addTask, {id: '5', name: 'a task'}, []),
//                        _.partial(addTask, {id: '6', name: 'a second task'}),
//                        _.partial(addTask, {id: '7', name: 'a third task'}),
//                        function (tasks, callback) {
//                            AsanaDataAccessLocal.removeTask(tasks[0]).then(function () {
//                                callback(null);
//                            }, callback);
//                        },
//                        function (callback) {
//                            AsanaDataAccessLocal.getTasks().then(function (resp) {
//                                console.log('getTasks:', resp);
//                                if (resp.length == 2) {
//                                    callback();
//                                }
//                                else {
//                                    callback(resp.length + ' rows when was expecting 2');
//                                }
//                            }, callback);
//                        }
//
//                    ],
//                    function (err) {
//                        if (err) {
//                            done(new Error(err));
//                        }
//                        else {
//                            done();
//                        }
//                    }
//                );
//
//
//
//            });
//        });

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
    });

});

