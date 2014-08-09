describe('expected pouch behaviour', function () {

    it('test delete', function (done) {
        var pouch = new PouchDB('sdfsdf');
        pouch.post({blah: 1}, function (err, resp) {
            if (err) done(new Error(err));
            pouch.get(resp.id, function (err, doc) {
                if (err) done(new Error(err));
                pouch.remove(doc._id, doc._rev, function (err) {
                    dump(PouchDB.version);
                    done(err ? new Error(err) : undefined);
                });
            });
        });
    });

    it('test delete with doc pattern', function (done) {
        var pouch = new PouchDB('sdfsdf');
        pouch.post({blah: 1}, function (err, resp) {
            if (err) done(new Error(err));
            pouch.get(resp.id, function (err, doc) {
                if (err) done(new Error(err));
                pouch.remove(doc, function (err) {
                    dump(PouchDB.version);
                    done(err ? new Error(err) : undefined);
                });
            });
        });
    });

    it('test delete with index', function (done) {
        var guid = (function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            return function () {
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            };
        })();
        var pouch = new PouchDB(guid());
        async.waterfall([
                function (callback) {
                    console.log('installing index');
                    var myIndex = {
                        _id: '_design/my_index',
                        views: {
                            'my_index': {
                                map: function (doc) {
                                    emit(doc.name, doc);
                                }.toString()
                            }
                        }
                    };
                    pouch.put(myIndex).then(function (resp) {
                        console.log('done installing index');
                        pouch.query('my_index', {stale:'update_after'}, callback);
                    }, callback);
                },
                function (putResponse, callback) {
                    console.log('inserting object');
                    pouch.post({name: 'foo'}, callback);
                },
                function (doc, callback) {
                    console.log(doc);
                    pouch.query(function (doc) {
                        emit(doc._id, doc);
                    }, callback);
                },
                function (queryResponse, callback) {
                    console.log(queryResponse);
                    pouch.remove(queryResponse.rows[0].value, callback);
                },
                function (removeResponse, callback) {
                    console.log(removeResponse);
                    pouch.query('my_index', callback);
                },
                function (queryResponse, callback) {
                    console.log(queryResponse);
                    callback();
                }

            ],
            _.partial(waterfallError, done));
    });
});

describe('pouch', function () {

    var $rootScope, $q, lazyPouchDB;

    beforeEach(function () {
        module('pouch', function ($provide) {
            $provide.value('$log', console);
            $provide.value('$q', Q); // This means we don't need to keep executing $rootScope.$apply, $rootScope.$digest
        });
        inject(function (_$q_, _$rootScope_, _lazyPouchDB_) {
            $q = _$q_;
            $rootScope = _$rootScope_;
            lazyPouchDB = _lazyPouchDB_;
        });
    });

    it('should return a pouch instance', function (done) {
        var promise = lazyPouchDB.getPromise();
        promise.then(function (pouch) {
            assert.ok(pouch);
            done();
        }, function (_err) {
            done(_err);
        });
    });

});


