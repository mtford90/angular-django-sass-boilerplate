angular.module('app.asana.restangular', ['restangular', 'base64'])

    // If an asana http request, pull the API key from settings service and inject into the headers.
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
        $httpProvider.interceptors.push('APIKeyInterceptor');
    })

    .factory('AsanaRestangular', function (Restangular) {
        return Restangular.withConfig(function (RestangularConfigurer) {
            RestangularConfigurer.setBaseUrl('/asana');
//            RestangularConfigurer.addResponseInterceptor(function (data, op, what, url) {
            RestangularConfigurer.addResponseInterceptor(function (data) {
                // Extract the data field.
                if ('data' in data) {
                    return data.data;
                }
            });
        });
    })

    .constant('ASANA_ERRORS', {
        NO_API_KEY: 0
    })

;