angular.module('pouch', [])

    .constant('INDEXES', {
        asana_tasks_index: {
            map: function (doc) {
                if (doc.type == 'task' && doc.source == 'asana' && !doc._deleted) {
                    emit(doc._id, doc);
                }
            }
        },
        active_user_index: {
            map: function (doc) {
                if (doc.type == 'user' && doc.active && !doc._deleted) {
                    emit(doc._id, doc);
                }
            }
        }
    })

    // A service that defers the return of the pouchdb instance so that it has time to
    // initialise/load..
    .factory('lazyPouchDB', function ($q, $log, INDEXES) {
        var pouch = null;
        var deferred = $q.defer();

        /**
         * Takes a couchdb design doc and inserts this into the database.
         * @param index
         * @param name
         * @returns promise
         * @private
         */
        function __installIndex(index, name) {
            $log.debug('installing index:', index, name);
            var deferredInstallationOfIndex = $q.defer();
            pouch.put(index).then(function (resp) {
                deferredInstallationOfIndex.resolve(resp);
            }, function (err) {
                $log.error('error installing index ' + name, err);
                if (err.status == 409) { // Already exists.
                    $log.debug('index ' + name + ' already exists, therefore ignoring');
                    deferredInstallationOfIndex.resolve(index);
                }
                else {
                    deferredInstallationOfIndex.reject(err);
                }
            });
            return deferredInstallationOfIndex.promise;
        }

        /**
         * Given a name and a map function, creates a pouchdb 'index'
         * An index is essentially a couchdb design document with a single view.
         * See http://pouchdb.com/2014/05/01/secondary-indexes-have-landed-in-pouchdb.html for more explanations on this
         * and why they're useful.
         * @param name the name of the index
         * @param map a couchdb/puchdb map function
         * @returns promise a promise to install the new index
         */
        function installIndex(name, map) {
            var views = {};
            views[name] = {map: map.toString()};
            return __installIndex({
                _id: '_design/' + name,
                views: views
            }, name);
        }

        /**
         * Sets up pouchdb instance, installs indexes (if not already installed) and configures
         * the promise.
         * @returns {*}
         */
        function initialisePouchDB() {
            $log.debug('Initialising PouchDB');
            pouch = new PouchDB('db');
            var indexesInstalled = 0;
            var errors = [];
            var numIndexes = 0;
            for (var key in INDEXES) {
                if (INDEXES.hasOwnProperty(key)) {
                    numIndexes++;
                }
            }
            /**
             * Checks to see if all indexes have been installed (or otherwise)
             */
            function checkFinished() {
                $log.debug('checkFinished');
                if ((indexesInstalled + errors.length) == numIndexes) {
                    if (errors.length) {
                        $log.error('Errors initialising pouch:', errors);
                        deferred.reject(errors);
                    }
                    else {
                        $log.info('All indexes are now installed');
                        deferred.resolve(pouch);
                    }
                }
            }

            var onSuccess = function () {
                indexesInstalled++;
                checkFinished();
            };
            var onFail = function (err) {
                errors.push(err);
                checkFinished();
            };
            $log.info('There are ' + numIndexes + ' indexes to install');
            for (var name in INDEXES) {
                if (INDEXES.hasOwnProperty(name)) {
                    $log.debug('installing index', name);
                    installIndex(name, INDEXES[name].map).then(onSuccess, onFail);
                }
            }
            return deferred.promise;
        }

        initialisePouchDB();

        return {
            getPromise: function () {
                if (deferred) {
                    return deferred.promise;
                }
                return null;
            },
            reset: function () {
                var resetDeferred = $q.defer();
                deferred.promise.then(function (dbInstance) {
                   $log.debug('Resetting pouchdb');
                   dbInstance.
                }, deferred.reject);
                return resetDeferred.promise;
            }
        };

    })

;