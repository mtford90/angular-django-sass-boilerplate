angular.module('app.resources', ['ngResource'])

    .config(['$resourceProvider', function ($resourceProvider) {
        // Don't strip trailing slashes from calculated URLs
        $resourceProvider.defaults.stripTrailingSlashes = false;
    }])

    .constant('RESOURCE_OPTS', (function () {
        var opts = {
            update: {
                method: "PATCH"
            },
            query: {
                method: "GET",
                isArray: true,
                params: {
                    page_size: 10,
                    page: 1
                },
                transformResponse: function (data, headersGetter) {
                    var parsed = JSON.parse(data);
                    var results = parsed.results;
                    for (var idx in results) {
                        var result = results[idx];
                        result.count = parsed.count;
                    }
                    return results;
                }
            },
            list: {
                method: "GET",
                params: {
                    page_size: 10,
                    page: 1
                },
                isArray: false
            },
            count: {
                method: "GET",
                isArray: false,
                params: {
                    page_size: 0,
                    page: 1
                },
                transformResponse: function (data, headersGetter) {
                    var parsed = JSON.parse(data);
                    var count = parsed.count;
                    console.log('transform:', count);
                    return  {count: count};
                }
            }
        };
        return opts;

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
            var config = response.config;
            var data = response.data;
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
            responseError: function (rejection) {
//                $log.error('response error intercept', rejection);
                logResponse(rejection);
                return $q.reject(rejection);
            },
            request: function (config) {
                var token = $cookies['csrftoken'];
                $log.debug('Setting token:', token);
                config.headers['X-CSRFToken'] = token;
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

    .config(function ($httpProvider) {
        $httpProvider.interceptors.push('LogHTTPInterceptor');
    })

    .factory('Feedback', function ($resource, RESOURCE_OPTS) {
        var opts = $.extend(true, {}, RESOURCE_OPTS);
        opts.update.transformRequest = function (data, headersGetter) {
            if (data.comments) {
                delete data.comments;
            }
            if (data.user) {
                data.user = data.user.id;
            }
            return JSON.stringify(data);
        };
        return $resource(
            "/api/feedback/:Id/",
            {
                Id: "@id"
            },
            opts
        );
    })

    .factory('Vote', function ($resource, RESOURCE_OPTS) {
        return $resource(
            "/api/votes/:Id/",
            {
                Id: "@id"
            },
            RESOURCE_OPTS
        );
    })

    .factory('User', function ($resource, RESOURCE_OPTS, $log) {
        var opts = $.extend(true, {}, RESOURCE_OPTS);
        // We send profile photo data via post data so must ensure this is filtered out
        // or django rest framework will complain.
        opts.update.transformRequest = function (data, headersGetter) {
            $log.debug('Transforming USER request');
            if (data.profile_photo_url) {
                delete data.profile_photo_url;
            }
            if (data.profile_photo) {
                delete data.profile_photo;
            }
            return JSON.stringify(data);
        };
        return $resource(
            "/api/users/:Id/",
            {
                Id: "@id"
            },
            opts
        );
    })


    .factory('Comment', function ($resource, RESOURCE_OPTS) {
        return $resource(
            "/api/comments/:Id/",
            {
                Id: "@id"
            },
            RESOURCE_OPTS
        );
    })


;
