/**
 * A configurable logging service that wraps $log
 */
angular.module('app.logging', [])

    .constant('logLevels', {
        trace: 0,
        debug: 1,
        info: 2,
        warning: 3,
        warn: 3,
        error: 4
    })

    .factory('jlogConfig', function (logLevels) {
        var ll = {
            http: logLevels.warning,
            resources: logLevels.warning
        };

        var t = {};
        t[logLevels.trace] = 'TRACE';
        t[logLevels.debug] = 'DEBUG';
        t[logLevels.info] = 'INFO ';
        t[logLevels.warning] = 'WARN ';
        t[logLevels.error] = 'ERROR';

        var d = logLevels.trace;

        return {
            logLevel: function (name) {
                var level = ll[name];
                if (level) {
                    return level;
                }
                else {
                    return d;
                }
            },
            logLevelAsText: function(level) {
                return t[level];
            }
        };
    })

    .factory('jlog', function ($log, jlogConfig, logLevels) {
        var Logger = function(name) {
            this.name = name;
        };
        Logger.prototype.performLog = function (logFunc, level, message, otherArguments) {
            var currentLevel = jlogConfig.logLevel(this.name);
            if (currentLevel <= level) {
                logFunc = _.partial(logFunc, jlogConfig.logLevelAsText(level) + ' [' + this.name + ']: ' + message);
                var args = [];
                for (var i=0; i<otherArguments.length; i++) {
                    args[i] = otherArguments[i];
                }
                args.splice(0, 1);
                logFunc.apply(logFunc, args);
            }
        };
        Logger.prototype.$trace = function (message) {
            this.performLog($log.debug, logLevels.trace, message, arguments);
        };
        Logger.prototype.trace = Logger.prototype.$trace;
        Logger.prototype.$debug = function (message) {
            this.performLog($log.debug, logLevels.debug, message, arguments);
        };
        Logger.prototype.debug = Logger.prototype.$debug;
        Logger.prototype.$log = Logger.prototype.$debug;
        Logger.prototype.log = Logger.prototype.$debug;
        Logger.prototype.$info = function (message) {
            this.performLog($log.info, logLevels.info, message, arguments);
        };
        Logger.prototype.info = Logger.prototype.$info;
        Logger.prototype.$warn = function (message) {
            this.performLog($log.warn, logLevels.warning, message, arguments);
        };
        Logger.prototype.warn = Logger.prototype.$warn;
        Logger.prototype.warning = Logger.prototype.$warn;
        Logger.prototype.$warning = Logger.prototype.$warn;
        Logger.prototype.$error = function (message) {
            this.performLog($log.error, logLevels.error, message, arguments);
        };
        Logger.prototype.error = Logger.prototype.$warn;
        return {
            loggerWithName: function (name) {
                return new Logger(name);
            }
        };
    });