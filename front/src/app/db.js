angular.module('app.db', [])

    .factory('Database', function () {
        var db = new PouchDB('pomodoro');
        return {
            instance: db
        };
    });
