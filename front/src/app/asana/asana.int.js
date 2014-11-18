describe('asana integration', function () {

    function processIndividualAsanaError(err) {
        err = err.data.errors[0];
        // Most of the Asana REST API errors are in this format.
        if (err.message) {
            err = err.message;
        }
        return err;
    }

    /**
     * Takes an error and attempts to coerce into a human-readable format
     * @param err
     */
    function processError(err) {
        if (err.data) {
            if (err.data.errors) {
                if (err.data.errors.length == 1) {
                    err = processIndividualAsanaError(err);
                    return err;
                }
                else {
                    err = _.each(err.data.errors, processIndividualAsanaError);
                    return err;
                }
            }
            else {
                return err.data
            }
        }
        else {
            return err;
        }
    }


    this.timeout(30000);

    var AsanaRemote, Settings, $log;

    beforeEach(function (done) {
        var $injector = angular.injector(['ng', 'app', 'app.asana.restangular']);
        $injector.invoke(function (_AsanaRemote_, _Settings_, _$log_) {
            AsanaRemote = _AsanaRemote_;
            Settings = _Settings_;
            $log = _$log_;
            var asanaApiKey = asana.key;
            Settings.set('asanaApiKey', asanaApiKey, function (err) {
                if (err) done(new Error(err));
                done();
            });
        });
    });

    it('get user', function (done) {
        AsanaRemote.getUser(function (err, user) {
            if (err) done(new Error(err));
            console.log({err: err, user: user});
            try {
                assert.notOk(err);
                assert.ok(user);
                console.log('workspaces', user.workspaces);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    it('get tasks', function (done) {
        AsanaRemote.getTasks(asana.workspaceId, function (err, tasks) {
            console.log('getTasks', {err: err, tasks: tasks});
            try {
                assert.notOk(err);
                assert.ok(tasks);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    it('get projects', function (done) {
        AsanaRemote.getProjects(function (err, projects) {
            console.log('getProjects', {err: err, projects: projects});
            try {
                assert.notOk(err);
                assert.ok(projects);
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });

    it('create and delete task', function (done) {
        AsanaRemote.getUser(function (err, user) {
            if (err) {
                done(err.errors);
            }
            else {
                AsanaRemote.createTask({
                    assignee: user.id,
                    workspace: asana.workspaceId,
                    name: 'testing testing 123'
                }, function (err, task) {
                    console.log('create task returned:', {err: err, task: task});
                    if (err) {
                        done(new Error(processError(err)));
                    }
                    else {
                        try {
                            assert.ok(task.id);
                            AsanaRemote.deleteTask(task, done);
                        }
                        catch (err) {
                            done(err);
                        }
                    }
                });
            }
        });
    });

    it('create and complete task', function (done) {
        AsanaRemote.getUser(function (err, user) {
            if (err) {
                done(err.errors);
            }
            else {
                AsanaRemote.createTask({
                    assignee: user.id,
                    workspace: asana.workspaceId,
                    name: 'testing testing 123'
                }, function (err, task) {
                    console.log('create task returned:', {err: err, task: task});
                    if (err) {
                        done(new Error(processError(err)));
                    }
                    else {
                        try {
                            assert.ok(task.id);
                            AsanaRemote.completeTask(task, done);
                        }
                        catch (err) {
                            done(err);
                        }
                    }
                });
            }
        });
    });


});