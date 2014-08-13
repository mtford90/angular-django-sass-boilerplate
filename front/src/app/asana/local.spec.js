describe('app.asana.data', function () {

    var $rootScope, $q, AsanaLocal;

    beforeEach(function (done) {
        module('app.asana.data', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });

        inject(function (_$q_, _$rootScope_, _AsanaLocal_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
            AsanaLocal = _AsanaLocal_;

        });

        clearStorage().then(done, done);
    });

    describe('User', function () {
        var AsanaLocal;

        beforeEach(
            function (done) {
                inject(function (_AsanaLocal_) {
                    AsanaLocal = _AsanaLocal_;
                    done();
                });
            }
        );

        function injectUser(name, id) {
            console.log('injectUser');
            name = name || 'Michael Ford';
            id = id || 'fakeid';
            return AsanaLocal.setActiveUser({
                name: name,
                id: id
            });
        }

        it('should return null if no user', function (done) {
            async.waterfall(
                [
                    function (callback) {
                        AsanaLocal.getUser().then(function (user) {
                            var err;
                            if (user) {
                                err = 'user not null';
                            }
                            callback(err, user);
                        }, callback);
                    }
                ],
                _.partial(waterfallError, done)
            );
        });

        it('should return a user if one exists', function (done) {
            async.waterfall(
                [
                    function (callback) {
                        injectUser().then(function (user) {
                            console.debug('injectUser success', user);
                            callback(null);
                        }, callback);
                    },
                    function (callback) {
                        AsanaLocal.getUser().then(function (user) {
                            console.log('getUser returned:', user);
                            var err;
                            if (!user) {
                                err = 'No user returned';
                            }
                            callback(err);
                        }, callback);
                    }
                ],
                _.partial(waterfallError, done));
        });

        it('should update existing user', function () {
            inject(function (AsanaLocal) {
                async.waterfall([
                    function (callback) {
                        injectUser().then(_.partial(callback, null), callback);
                    },
                    function (callback) {
                        AsanaLocal.getUser().then(function (user) {
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
                        AsanaLocal.getUser().then(function (user) {
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

        it('should return [] if no tasks', function (done) {
            inject(function (AsanaLocal) {
                AsanaLocal.getTasks().then(function (tasks) {
                    console.log('got tasks', tasks);
                    assert.equal(0, tasks.length);
                    done();
                }, mochaError(done));
            });
        });

        it('should return the task if added one task', function (done) {
            inject(function (AsanaLocal) {
                async.waterfall([
                        function (callback) {
                            AsanaLocal.addTask({
                                id: '5',
                                name: 'a task'
                            }).then(function (resp) {
                                callback(null, resp);
                            }, callback);
                        },
                        function (addTaskResponse, callback) {
                            AsanaLocal.getTasks().then(function (tasks) {
                                callback(null, tasks);
                            }, callback);
                        }
                    ],
                    function (err, tasks) {
                        if (err) {
                            done(err);
                        }
                        // TODO: For some reason async.js hides AssertionErrors
                        try {
                            assert.equal(tasks.length, 1, 'should now be one task');
                            assert.equal(tasks[0].name, 'a task');
                            assert.equal(tasks[0].id, '5');
                            assert.ok(tasks[0]._id);
                            assert.equal(tasks[0].type, 'task');
                            done();
                        }
                        catch (err) {
                            done(new Error(err));
                        }
                    });
            });
        });

        it('should return the task if added multiple tasks', function (done) {
            inject(function (AsanaLocal) {

                function addTask(task, callback) {
                    AsanaLocal.addTask(task).then(function () {
                        callback();
                    }, callback);
                }

                async.waterfall([
                        _.partial(addTask, {id: '5', name: 'a task'}),
                        _.partial(addTask, {id: '6', name: 'a second task'}),
                        _.partial(addTask, {id: '7', name: 'a third task'}),
                        function (callback) {
                            AsanaLocal.getTasks().then(_.partial(callback, null), callback);
                        }
                    ],
                    function (err, tasks) {
                        if (err) {
                            done(err);
                        }
                        // TODO: For some reason async.js hides AssertionErrors
                        try {
                            assert.equal(tasks.length, 3, 'should now be three tasks');
                            done();
                        }
                        catch (err) {
                            done(new Error(err));
                        }
                    });
            });
        });

        it('should return all tasks minus the removed task when removed', function (done) {
            AsanaLocal.addTasks([
                {id: '5', name: 'a task'},
                {id: '6', name: 'a second task'},
                {id: '7', name: 'a third task'}
            ]).then(function success(tasks) {
                console.log('inserted tasks:', tasks);
                AsanaLocal.removeTask(tasks[1]).then(function () {
                    AsanaLocal.getTasks().then(function (resp) {
                        console.log('getTasks:', resp);
                        var err;
                        if (resp.length != 2) {
                            err = 'Length is ' + resp.length.toString() + ' when expected 2';
                        }
                        done(err);
                    });
                }, done);
            }, done);
        });

        it('should return no tasks if cleared', inject(function () {
            inject(function (AsanaLocal) {
                function addTask(task, tasks, callback) {
                    AsanaLocal.addTask(task).then(function (resp) {
                        task._rev = resp.rev;
                        task._id = resp.id;
                        tasks.push(task);
                        callback(null, tasks);
                    }, callback);
                }

                async.waterfall(
                    [
                        _.partial(addTask, {id: '5', name: 'a task'}, []),
                        _.partial(addTask, {id: '6', name: 'a second task'}),
                        _.partial(addTask, {id: '7', name: 'a third task'}),
                        function (tasks, callback) {
                            AsanaLocal.clearTasks().then(function () {
                                callback();
                            }, callback);
                        },
                        function (callback) {
                            AsanaLocal.getTasks().then(function (resp) {
                                console.log('getTasks:', resp);
                                if (resp.length == 0) {
                                    callback();
                                }
                                else {
                                    callback(resp.length + ' rows when was expecting 0');
                                }
                            }, callback);
                        }

                    ],
                    function (err) {
                        if (err) {
                            done(new Error(err));
                        }
                        else {
                            done();
                        }
                    }
                );
            });

        }));

        it('should raise an error if Asana task with that id already exists', function (done) {
            AsanaLocal.addTasks([
                {id: '5', name: 'a task'}
            ]).then(function success(tasks) {
                AsanaLocal.addTasks([
                    {id: '5', name: 'a task'}
                ]).then(function success(tasks) {
                    done('should not have succeeeded');
                }, function (err) {
                    done();
                });
            }, done);
        });

    });

});

