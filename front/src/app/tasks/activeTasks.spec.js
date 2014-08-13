describe('app.tasks.ActiveTasks', function () {

    var $rootScope, ActiveTasks, AsanaLocal;


    function propogateErrors(assertions, done) {
        try {
            assertions();
            done();
        }
        catch (err) {
            console.error(err);
            done(err);
        }
    }

    beforeEach(function (done) {
        module('app.tasks', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q);
        });

        inject(function (_$rootScope_, _ActiveTasks_, _AsanaLocal_) {
            $rootScope = _$rootScope_;
            ActiveTasks = _ActiveTasks_;
            AsanaLocal = _AsanaLocal_;
        });

        clearStorage().then(done, done);
    });

    it('get active tasks when empty', function (done) {
        var finished = false;
        ActiveTasks.getActiveTasks(function (err, tasks) {
            finished = true;
            console.log('getActiveTasks returned', {err: err, tasks: tasks});
            propogateErrors(function () {
                assert.notOk(err);
                assert.equal(tasks.length, 0);
            }, done);
            done();
        });
    });

    function addTasks(tasks, callback) {
        console.log('adding tasks', tasks);
        var numTaskAdded = 0;
        var errors = [];
        _.each(tasks, function (task) {
            AsanaLocal.addTask(task, function (err, task) {
                console.log('added task', err, task);
                if (err) {
                    errors.push(err);
                }
                numTaskAdded++;
                if (numTaskAdded == tasks.length) {
                    callback(errors.length ? errors : null, tasks);
                }
            });
        });
    }

    it('get active tasks when empty', function (done) {


        addTasks([
            {id: '5', name: 'a task'},
            {id: '6', name: 'a second task'},
            {id: '7', name: 'a third task'}
        ], function (err, tasks) {
            assert.notOk(err);
            ActiveTasks.activateTask(tasks[1]._id, function (err) {
                assert.notOk(err);
                ActiveTasks.getActiveTasks(function (err, tasks) {
                    console.log('getActiveTasks returned', {err: err, tasks: tasks});
                    propogateErrors(function () {
                        assert.notOk(err);
                        assert.equal(tasks.length, 1);
                    }, done);
                });
            });

        });

    });




});
