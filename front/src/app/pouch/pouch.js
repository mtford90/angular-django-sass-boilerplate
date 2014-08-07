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
            pouch.put(index).then(function () {
                // Kick off initial update.
                $log.debug('Kicking off initial update for index ' + name);
                pouch.query(name, {stale: 'update_after'}).then(function (resp) {
                    $log.debug('successfully executed initial update for index ' + name + ':', resp);
                    deferredInstallationOfIndex.resolve(resp);
                }, function (err) {
                    $log.error('error executing initial update for index ' + name + ':', err);
                    deferredInstallationOfIndex.reject(err);
                });
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
            var numIndexes = INDEXES.getSize();


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
            /**
             * Inject pouchdb instance manually. Useful for testing.
             * @param _pouch a pouchdb instance
             */
            inject: function (_pouch) {
                pouch = _pouch;
            },
            /**
             * Destroy the existing pouchdb instance and start from scratch.
             * Note this is pretty inefficient as it walks through each doc and deletes it, hence iterating
             * over every single row.
             * Prob only useful in testing.
             *
             * Previous implementation simply destroyed the entire databse but there were issues with indexedb.
             *  - https://github.com/pouchdb/pouchdb/issues/1291
             *
             *  TODO: Randomly name the database and store that name in local storage? This way can use destroy as will be an entirely new db.
             * @returns promise
             */
            reset: function () {
                $log.debug('Resetting pouchdb');
                var oldDeferred = deferred;
                deferred = $q.defer();
                oldDeferred.promise.then(function (dbInstance) {
                    dbInstance.query(function (doc) {
                        if (!doc._deleted) {
                            emit(doc._id, doc);
                        }
                    }).then(function (resp) {
                        var docs = resp.rows;

                        $log.debug('there are ' + docs.length + ' documents to delete for reset');

                        docs = _.pluck(docs, 'value');

                        $log.debug('deleting docs:', docs);

                        _.map(docs, function (doc) {
                            doc._deleted = true;
                        });

                        dbInstance.bulkDocs(docs, function (err, response) {
                           if (err) {
                               deferred.reject(err);
                           }
                            else { 
                               deferred.resolve(docs.length);
                               dbInstance.compact();
                           }
                        });
                    }, function (err) {
                        $log.error('error querying for docs when resetting:', err);
                        deferred.reject(err);
                    });
                }, deferred.reject);
                return deferred.promise;
            }
        };

    })

;