angular.module('contentEditable', [])

    .directive('contentEditableDirective', function ($compile, $log) {

        return {
            restrict: 'A',
            template: '<div class="editable" style="display:inline">{{value}}</div>',
            scope: {
                name: '=',
                onStartEditing: '=',
                onEndEditing: '=',
                onChange: '=',
                value: '=',
                context: '=',
                editable: '='
            },
            link: function (scope, element) {
                function getEditable() {
                    return $(element).find('.editable').get(0);
                }

                var wrapper = angular.element('<div></div>');
                var pencil = angular.element('<sup><a ng-click="toggleEditing()"><i class="glyphicon glyphicon-pencil" ng-if="!editing"></i></a></sup>');
                scope.editing = false;
                element.wrap(wrapper);
                function addPencil() {
                    element.append(pencil);
                    $compile(pencil.contents())(scope);
                }

                scope.$watch('editable', function (newValue) {
                    $log.debug('editable changed to', newValue);
                    if (!newValue) {
                        pencil.remove();
                        scope.editing = false;
                    }
                    else {
                        addPencil();
                    }
                });

                scope.toggleEditing = function () {
                    var $editable = $(getEditable());
                    $editable.attr('contentEditable', true);
                    scope.editing = true;
                    $editable.focus();
                };

                function editingOff() {
                    $(getEditable()).attr('contentEditable', false);
                    scope.$apply(function () {
                        scope.editing = false;
                    });
                }

                $(getEditable()).keydown(function (e) {
                    var keyCode = e.keyCode;
                    var enterKey = 13;
                    if (keyCode == enterKey) {
                        editingOff();
                    }
                });

                $(getEditable()).blur(function () {
                    editingOff();
                });

                scope.$watch('value', function (newValue, oldValue) {

                });

                var valueAtStart = null;
                var valueAtEnd = null;

                scope.$watch('editing', function (newValue, oldValue) {
                    var initialLoad = newValue === oldValue;
                    var editable = getEditable();
                    if (!initialLoad) {
                        var stageFunction;
                        if (newValue) {
                            valueAtStart = $(getEditable()).text();
                            stageFunction = scope.onStartEditing;
                        }
                        else {
                            valueAtEnd = $(getEditable()).text();
                            stageFunction = scope.onEndEditing;
                            if ((valueAtStart != valueAtEnd) && scope.onChange) {
                                scope.onChange(valueAtEnd, valueAtStart, editable, scope.context);
                            }
                        }
                        if (stageFunction) {

                            var text = $(editable).text().trim();
                            stageFunction(text, editable, scope.context);
                        }
                    }

                });


            }
        };
    });