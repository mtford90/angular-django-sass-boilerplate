angular.module('app.asana', ['ngResource', 'base64'])

//    .config(['$resourceProvider', function ($resourceProvider, $base64) {
//        // Don't strip trailing slashes from calculated URLs
////        $resourceProvider.defaults.stripTrailingSlashes = false;
//    }])

    .constant('RESOURCE_OPTS', (function () {
        return {
            update: {
                method: "PATCH"
            },
            query: {
                method: "GET",
                isArray: true

            },
            list: {
                method: "GET",
                isArray: false
            },
            count: {
                method: "GET",
                isArray: false
            }
        };
    })())

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
                logResponse(response);
                return response;
            },
//            responseError: function (rejection) {
//                logResponse(rejection);
//                return $q.reject(rejection);
//            },
            request: function (config) {
                logRequest(config);
                return config;
            }
//            requestError: function (rejection) {
//                $log.error('request error intercept');
//                logRequest(rejection);
//                return $q.reject(rejection);
//            }
        };
    })

/**
 * Use basic auth with asana API key.
 * See http://developer.asana.com/documentation/#api_keys for information on this
 */
    .factory('APIKeyInterceptor', function ($base64, $log, $q, ASANA_API_KEY, SettingsService) {
        return {
            request: function (config) {
                $log.debug('intercepting request:', config);
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
                    /**
                     * TODO
                     * For some reason there's an issue with returning promise rejections.
                     * If $q.reject is returned then ui.router fucks up and doesn't display anything any more.
                     * Therefore at the moment I'm 'intercepting' in each resource itself.
                     * Pain in the ass.
                     */
                    $log.error('shouldnt be getting here');
//                    $log.info('rejecting asana request as no api key');
                    // If we uncomment the below and comment out the api key checks in the resource
                    // services, ui-router no longer works.
//                    return $q.reject('Cannot send an asana request without api key present');
                }
            }
        };
    })

    .config(function ($httpProvider) {
//        $httpProvider.interceptors.push('LogHTTPInterceptor');
        $httpProvider.interceptors.push('APIKeyInterceptor');
    })


    .factory('User', function ($resource, RESOURCE_OPTS) {
        var opts = $.extend(true, {}, RESOURCE_OPTS);
        return $resource(
            "asana/users/me",
            {},
            opts
        );
    })

    .factory('Workspace', function ($resource, RESOURCE_OPTS) {
        var opts = $.extend(true, {}, RESOURCE_OPTS);
        return $resource(
            "asana/workspace",
            {},
            opts
        );
    })


;