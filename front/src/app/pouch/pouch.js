angular.module('pouch', [])



    // A service that defers the return of the pouchdb instance so that it has time to
    // initialise/load..
    .provider('lazyPouchDB', function LazyPouchDBProvider() {
        var INDEXES = {
            asana_tasks_index: {
                map: function (doc) {
                    if (doc.type == 'task' && doc.source == 'asana') {
                        emit(doc.id, doc);
                    }
                }
            },
            active_user_index: {
                map: function (doc) {
                    if (doc.type == 'user' && doc.active) {
                        emit(doc.id, doc);
                    }
                }
            }
        };

        this.INDEXES = INDEXES;

        this.$get = function ($q, $log) {
            console.log('$get');
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
                    if (err.status == 409) { // Already exists.
                        $log.debug('index ' + name + ' already exists, therefore ignoring');
                        deferredInstallationOfIndex.resolve(index);
                    }
                    else {
                        $log.error('error installing index ' + name, err);
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
             * @param reduce a couchdb/puchdb reduce function
             * @returns promise a promise to install the new index
             */
            function installIndex(name, map, reduce) {
                var views = {};
                views[name] = {map: map.toString()};
                if (reduce) {
                    views[name].reduce = reduce.toString();
                }
                return __installIndex({
                    _id: '_design/' + name,
                    views: views
                }, name);
            }

            function _initialisePouchDB() {
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
                        installIndex(name, INDEXES[name].map, INDEXES[name].reduce).then(onSuccess, onFail);
                    }
                }
                return deferred.promise;
            }

            /**
             * Sets up pouchdb instance, installs indexes (if not already installed) and configures
             * the promise.
             * @returns {*}
             */
            function initialisePouchDB() {
                pouch = new PouchDB('db');
                return _initialisePouchDB();
            }

            /**
             * This is a nice little workaround for the confusing revision identifiers
             * with pouchdb.
             * https://github.com/pouchdb/pouchdb/issues/1691 demonstrates the confusion nicely and contains
             * the function below that has been adapted to latest pouch versions.
             * @param doc
             * @returns promise
             */
            function retryUntilWritten(doc) {
                var HTTP_CONFLICT = 409;
                $log.debug('retryUntilWritten:', doc);
                var retryDeferred = $q.defer();
                deferred.promise.then(function (db) {
                    $log.debug('here we go');
                    db.get(doc._id).then(function (origDoc) {
                        $log.debug('here we go again');
                        doc._rev = origDoc._rev;
                        return db.put(doc).then(function (resp) {
                            doc._id = resp.id;
                            doc._rev = resp.rev;
                            retryDeferred.resolve(doc);
                        }, retryDeferred.reject);
                    }, function (err) {
                        if (err.status === HTTP_CONFLICT) {
                            $log.debug('conflict, retrying');
                            retryUntilWritten(doc).then(retryDeferred.resolve, retryDeferred.reject);
                        } else { // new doc
                            $log.debug('doc with id ' + id + ' does not exist so adding new doc', err);
                            // Avoid https://github.com/pouchdb/pouchdb/issues/2570 by only passing id param
                            // if one doesn't exist in the object itself.
                            return db.put(doc).then(function (resp) {
                                $log.debug('successfully created new doc:', resp);
                                retryDeferred.resolve(resp);
                            }, function (err) {
                                $log.error('error creating new doc:', err, doc._id);
                                retryDeferred.reject(err);
                            });
                        }
                    });
                }, retryDeferred.reject);
                return retryDeferred.promise;
            }

            initialisePouchDB();

            return {
                getPromise: function () {
                    if (deferred) {
                        return deferred.promise;
                    }
                    return null;
                },
                inject: function (_pouch) {
                    var newDeferred = $q.defer();

                    _pouch.info(function (err, info) {
                        if (!err) {
                            $log.debug('injecting:', info);
                            deferred.promise.then(function (dbInstance) {
                                deferred = newDeferred;
                                pouch = _pouch;
                                _initialisePouchDB();
                            }, newDeferred.reject);
                        }
                        else {
                            newDeferred.reject(err);
                        }
                    });

                    return newDeferred.promise;
                },
                retryUntilWritten: retryUntilWritten
            };

        };
    })

;