
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

    // TODO: Callback hell here...
    it('should reset', function (done) {
        lazyPouchDB.getPromise().then(function (pouch) {
            pouch.post({blah: 5}).then(function (resp) {
                console.log('post succeeded', resp);
                pouch.query(function (doc) {
                    if (!doc.deleted) {
                        emit(doc._id, doc);
                    }
                }).then(function (rows) {
                    console.log('got rows', rows);
                    assert.ok(rows.total_rows);
                    lazyPouchDB.reset().then(function () {
                       done();
                    }, mochaError(done));
                }, mochaError(done));
            }, mochaError(done));
        });
    });
});

