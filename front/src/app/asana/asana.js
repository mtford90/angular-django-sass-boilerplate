angular.module('app.asana', ['restangular', 'base64'])


    .factory('AsanaRestangular', function (Restangular) {
        return Restangular.withConfig(function (RestangularConfigurer) {
            RestangularConfigurer.setBaseUrl('/asana');
            RestangularConfigurer.addResponseInterceptor(function (data, op, what, url) {
                if ('data' in data) {
                    return data.data;
                }
            });
        });
    })

    .factory('Users', function (AsanaRestangular) {
        return AsanaRestangular.service('users');
    })

    .factory('Workspaces', function (AsanaRestangular) {
        return AsanaRestangular.service('workspaces');
    })

    .factory('Projects', function (AsanaRestangular) {
        return AsanaRestangular.service('projects');
    })

    .factory('Tasks', function (AsanaRestangular) {
        return AsanaRestangular.service('tasks');
    })

    .constant('LOG_HEADERS', false)

    .factory('LogHTTPInterceptor', function ($q, jlog, $cookies, LOG_HEADERS) {
        var $log = jlog.loggerWithName('http');
        var serialize = function (obj) {
            var str = [];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                }
            }
            return '?' + str.join("&");
        };

        function logResponse(response) {
            var data = response.data;
            var config = response.config;
            var url = config.url;
            if (config.params) {
                url += serialize(config.params);
            }
            var prelude = response.status + ' ' + config.method + ' ' + url;
            var contentType = response.headers('Content-Type');
            var isJSON = false;
            if (contentType) {
                isJSON = contentType.indexOf('json') > 0;
            }
            if (data !== undefined && isJSON) {
                $log.debug(prelude + ':', data);
            }
            else {
                $log.debug(prelude);
            }
        }

        function logRequest(config) {
            var url = config.url;
            if (config.params) {
                url += serialize(config.params);
            }
            var prelude;
            if (LOG_HEADERS) {
                prelude = '(' + JSON.stringify(config.headers) + ') ' + config.method + ' ' + url;
            }
            else {
                prelude = config.method + ' ' + url;
            }

            if (config.data === undefined) {
                $log.debug(prelude);
            }
            else {
                $log.debug(prelude + ':', config.data);
            }
        }

        return {
            response: function (response) {
                if (response.config) {
                    logResponse(response);
                }
                return response;
            },
            responseError: function (rejection) {
                if (rejection.config) {
                    logResponse(rejection);
                }
                return $q.reject(rejection);
            },
            request: function (config) {
                logRequest(config);
                return config;
            },
            requestError: function (rejection) {
                $log.error('request error intercept');
                logRequest(rejection);
                return $q.reject(rejection);
            }
        };
    })

    .constant('ASANA_ERRORS', {
        NO_API_KEY: 0
    })

/**
 * Use basic auth with asana API key.
 * See http://developer.asana.com/documentation/#api_keys for information on this
 */
    .factory('APIKeyInterceptor', function ($base64, $log, $q, ASANA_API_KEY, SettingsService, ASANA_ERRORS) {
        return {
            request: function (config) {
                if (config.url.substring(0, 6) == "/asana") {
                    var apiKey = SettingsService.get(ASANA_API_KEY);
                    if (apiKey) {
                        apiKey = apiKey.trim();
                        if (apiKey.length) {
                            var a = apiKey + ':';
                            $log.debug('unencoded:', a);
                            var s = 'Basic ' +
                                $base64.encode(a);
                            $log.debug('encoded:', s);
                            config.headers['Authorization'] = s;
                            return config;
                        }
                    }
                    else {
                        return $q.reject({
                            reason: 'Cannot send an asana request without api key present',
                            code: ASANA_ERRORS.NO_API_KEY
                        });
                    }
                }
                return config;
            }
        };
    })

    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('LogHTTPInterceptor');
        $httpProvider.interceptors.push('APIKeyInterceptor');
    })


//    .factory('User', function ($resource, RESOURCE_OPTS) {
//        var opts = $.extend(true, {}, RESOURCE_OPTS);
//        return $resource(
//            "asana/users/me",
//            {},
//            opts
//        );
//    })
//
//    .factory('Workspace', function ($resource, RESOURCE_OPTS) {
//        var opts = $.extend(true, {}, RESOURCE_OPTS);
//        return $resource(
//            "asana/workspace",
//            {},
//            opts
//        );
//    })


;