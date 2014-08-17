/**
 * Ensures that errors from other APIs conform to Mocha.
 * @param done
 * @returns {Function}
 */
function mochaError(done) {
    return function (err) {
        done(new Error(err));
    }
}

function waterfallError(done, err) {
    console.error('waterFallError:', err);
    var mochaError;
    if (err) {
        mochaError = new Error(err);
    }
    done(mochaError);
}

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

function clearStorage(callback) {
    console.log('clearStorage');
    var deferred = Q.defer();
    inject(function (_lazyPouchDB_, localStorageService) {
        localStorageService.clearAll();
        var dbName = guid();
        console.log('injecting PouchDB instance with name ' + dbName);
        _lazyPouchDB_.inject(new PouchDB(dbName)).then(function () {
            console.log('injected pouchDB instance successfully');
            if (callback) callback();
            deferred.resolve();
        }, function (err) {
            console.error('error installing pouch', err);
            if (callback) callback(err);
            deferred.reject(err);
        });
    });
    return deferred.promise;
}