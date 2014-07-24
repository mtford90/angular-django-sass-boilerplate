var mod = angular.module('app');

//mod.config(['$httpProvider', function ($httpProvider) {
//    $httpProvider.defaults.useXDomain = true;
//    delete $httpProvider.defaults.headers.common['X-Requested-With'];
//}
//]);

mod.constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
});

mod.config(function ($httpProvider) {
    $httpProvider.interceptors.push([
        '$injector',
        function ($injector) {
            return $injector.get('AuthInterceptor');
        }
    ]);
    $httpProvider.defaults.withCredentials = true;  // Send cookies.
});

mod.factory('dataAccess', function ($http, $log) {
    return {
        http: function (method, path, callback, data, extraOpts) {
            var opts = {method: method, url: path};
            if (data) {
                opts.data = data;
            }
            for (var prop in extraOpts) {
                if (extraOpts.hasOwnProperty(prop)) {
                    opts[prop] = extraOpts[prop];
                }
            }
            return $http(opts)
                .success(function (data, status, headers, config) {
                    if (callback) {
                        callback(null, data);
                    }
                })
                .error(function (data, status, headers, config) {
                    if (callback) {
                        callback(status, data);
                    }
                });
        },
        GET: function (path, callback) {
            var method = 'GET';
            return this.http(method, path, callback);
        },
        POST: function (path, data, callback, extraOpts) {
            var method = 'POST';
            return this.http(method, path, callback, data, extraOpts);
        }
    };
});

/**
 * Simple container for the users session. A singleton.
 */
mod.service('Session', function ($cookies, $rootScope, AUTH_EVENTS) {
    var self = this;
    this.create = function (sessionKey, user) {
        $cookies.sessionid = sessionKey;
        self.user = user;
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
    };

    this.destroy = function () {
        $cookies.sessionid = undefined;
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
    };

    this.getSession = function () {
        return $cookies.sessionid;
    };

    this.getUser = function () {
        return self.user;
    };

    return this;
});

mod.factory('AuthService', function (dataAccess, Session, User) {
    var self = {
        login: function (username, password, callback) {
            return dataAccess.POST('/api/login/', {username: username, password: password}, function (err, data) {
                if (!err) {
                    var sessionid = data.sessionKey;
                    var user = new User(data.user);
                    if (sessionid && user) {
                        Session.create(sessionid, user);
                    }
                    else {
                        callback('Bad response from server.');
                    }
                }
                callback(err);
            }, {withCredentials: false});
        },
        verify: function (callback) {
            return dataAccess.GET('/api/verify/', function (err, data) {
                if (!err) {
                    Session.create(Session.sessionid, new User(data.user));
                }
                callback(err);
            });
        },
        logout: function (callback) {
            return dataAccess.GET('/api/logout/', function (err, data) {
                if (!err) {
                    Session.destroy();
                }
                callback(err);
            });
        },
        signUp: function (credentials, callback) {
            return dataAccess.POST('/api/sign_up/', credentials, function (err) {
                if (!err) {
                    return self.login(credentials.username, credentials.password, callback);
                }
                callback(err);
            });
        },
        isAuthenticated: function () {
            return !!Session.sessionKey;
        }
    };
    return  self;
});

mod.factory("AuthInterceptor", function ($rootScope, $q, AUTH_EVENTS) {
    return {
        responseError: function (response) {
            if (response.status === 401) {
                $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated,
                    response);
            }
            if (response.status === 403) {
                $rootScope.$broadcast(AUTH_EVENTS.notAuthorized,
                    response);
            }
            if (response.status === 419 || response.status === 440) {
                $rootScope.$broadcast(AUTH_EVENTS.sessionTimeout,
                    response);
            }
            return $q.reject(response);
        }
    };
});