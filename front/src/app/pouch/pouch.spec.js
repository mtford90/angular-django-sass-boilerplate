
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


