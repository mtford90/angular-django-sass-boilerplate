angular.module('dropdown', [])

    .directive('dropdown', function ($compile, $log) {

        return {
            restrict: 'E',
            templateUrl: 'dropdown.tpl.html',
            scope: {
                'items': '='
            },
            link: function (scope, element) {


            }
        };
    });