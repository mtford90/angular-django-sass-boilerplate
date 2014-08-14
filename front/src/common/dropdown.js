angular.module('dropdown', [])

    .directive('dropdown', function ($compile, $log) {

        return {
            restrict: 'E',
            templateUrl: 'dropdown.tpl.html',
            scope: {
                'items': '=',
                'value': '@',
                'selected': '='
            },
            link: function (scope) {
                function configure() {
                    if (!scope.selected) {
                        $log.debug('Nothing selected');
                        if (scope.items) {
                            if (scope.items.length) {
                                scope.selected = scope.items[0];
                            }
                        }
                    }
                }
                configure();
                scope.$watch('items', configure);
                scope.$watch('value', configure);
                scope.selectItem = function (item) {
                    scope.selected = item;
                };
            }
        };
    });