describe('asana data', function () {

    var $rootScope, $q, AsanaLocal, AsanaData;

    beforeEach(function (done) {
        module('app.asana.data', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });

        inject(function (_$q_, _$rootScope_, _AsanaLocal_, _AsanaData_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
            AsanaLocal = _AsanaLocal_;
            AsanaData = _AsanaData_;
        });

        clearStorage().then(done, done);
    });

    function injectUser(name, id) {
        console.log('injectUser');
        name = name || 'Michael Ford';
        id = id || 'fakeid';
        return AsanaLocal.setActiveUser({
            name: name,
            id: id
        });
    }

    it('asda', function (done) {
        done();
//        AsanaLocal.setActiveUser({
//            name: 'Michael Ford',
//            id: 'fakeid'
//        }, function (err) {
//            if (err) done(err);
//            AsanaLocal.addTasks([
//                {id: '5', name: 'a task'}
//            ]).then(function success(tasks) {
//                var task = tasks[0];
//                AsanaData.completeTask(task._id, function (err, task) {
//                    if (err) {
//                        done(err);
//                    }
//                    else {
//                        assert.ok(task.completed);
//                        console.log('task completed', {err: err, task: task});
//                        done();
//                    }
//                });
//            }, done);
//        });

    });

});