angular.module('app.settings', [
    'pouch',
    'LocalStorageModule'
])

    .constant('SETTINGS_MAP_REDUCE', {
        name: 'settings_index',
        index: {
            map: function (doc) {
                console.log('settings_index map', doc);
                if (doc.type == 'setting') {
                    emit(doc._id, doc);
                }
            },
            reduce: function (key, values, rereduce) {
                var i, settings;
                if (rereduce) {
                    settings = {};
                    for (i = 0; i < values.length; i++) {
                        var previousSettings = values[i];
                        for (var k in previousSettings) {
                            if (previousSettings.hasOwnProperty(k)) {
                                if (settings[k]) {
                                    if (settings[k].ts < previousSettings[k].ts) {
                                        settings[k] = previousSettings[k];
                                    }
                                }
                                else {
                                    settings[k] = previousSettings[k];
                                }
                            }
                        }
                    }
                }
                else {
                    settings = {};
                    for (i = 0; i < key.length; i++) {
                        var value = values[i];
                        var name = value.name;
                        var ts = value.ts;
                        if (settings[name]) {
                            if (settings[name].ts < ts) {
                                settings[name] = value;
                            }
                        }
                        else {
                            settings[name] = value;
                        }
                    }
                }
                return settings;
            }
        }
    })

    .config(function (lazyPouchDBProvider, SETTINGS_MAP_REDUCE) {
        lazyPouchDBProvider.INDEXES[SETTINGS_MAP_REDUCE.name] = SETTINGS_MAP_REDUCE.index;
    })

    .factory('SettingsService', function (lazyPouchDB) {
        return {
            set: function (key, value, callback) {
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.post({type: 'setting', ts: new Date().getTime(), name: key, value: value}).then(function (resp) {
                        callback(null);
                    }, callback);
                }, callback);
            },
            get: function (key, callback) {
                this.getAll(function (err, settings) {
                    var value;
                    if (!err) {
                        value = settings[key];
                    }
                    callback(err, value);
                });
            },
            getAll: function (callback) {
                lazyPouchDB.getPromise().then(function (pouch) {
                    pouch.query('settings_index', function (err, response) {
                        if (err) {
                            callback(err);
                        }
                        else if (response.rows.length) {
                            var settings = response.rows[0].value;
                            for (var k in settings) {
                                if (settings.hasOwnProperty(k)) {
                                    settings[k] = settings[k].value;
                                }
                            }
                            callback(null, settings);
                        }
                        else {
                            callback(null, {});
                        }
                    });
                }, callback);
            }
        };
    });