angular.module('app.db', [])

    .factory('Database', function () {
        var db = new PouchDB('pomodoro');


        return {
            instance: db
        };
    })


    /**
     * For now, stored procedures are available in one place.
     */
    .factory('DatabaseProcedures', function () {



    })

;
