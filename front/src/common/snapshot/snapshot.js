angular.module('app.snapshot', [])


    .directive('snapshot', function (hiddenVideo, jlog, $sce) {

        var $log = jlog.loggerWithName('snapshot');

        var token = null;
        var onFinish = null;

        var $hidden = $('#hidden-video');
        var v = $hidden.get(0);

        function clear() {
            if (token) {
                onFinish();
                clearInterval(token);
                token = null;
                onFinish = null;
            }
        }

        function init($scope) {
            hiddenVideo.moveTo($scope.data.start, function () {
                $scope.$apply(function () {
                    $scope.t = v.currentTime;
                    var onLoad = $scope.onLoad;
                    if (onLoad) {
                        onLoad($scope.data);
                    }
                });
            });
        }

        function isFloat(n) {
            return !isNaN(parseFloat(n));
        }

        function controller($scope, $timeout) {
            $scope.isPlaying = false;

            function withinRange() {
                var end = $scope.data.end;
                return $scope.t < end;
            }


            $scope.play = function () {
                clear();
                var timeToMoveTo;
                if (withinRange()) {
                    $log.debug('Own time of ' + $scope.t + ' is within the limit. Carrying on from there');
                    timeToMoveTo = $scope.t;
                }
                else {
                    $log.debug('Own time of ' + $scope.t + ' is outside of the limit. Moving back to the start');
                    timeToMoveTo = $scope.data.start;
                }

                hiddenVideo.moveTo(timeToMoveTo, function () {
                    $scope.t = timeToMoveTo;
                    hiddenVideo.play(function () {
                        $scope.isPlaying = true;
                        token = setInterval(function () {
                            if (withinRange()) {
                                $scope.$apply(function () {
                                    $scope.t = v.currentTime;
                                });
                            }
                            else {
                                clear();
                                $scope.$apply(function () {
                                    $scope.isPlaying = false;
                                });
                                hiddenVideo.pause(function () {
                                });
                            }
                        }, 20);
                        onFinish = function () {
                            $scope.isPlaying = false;
                        };
                    });
                });
            };

            $scope.playOrStop = function () {
                if ($scope.isPlaying) {
                    $scope.stop();
                }
                else {
                    $scope.play();
                }
            };

            $scope.stop = function () {
                clear();
                $scope.isPlaying = false;
                hiddenVideo.pause(function () {
                });
            };

            init($scope);
        }

        function link(scope, element) {
            var canvas = $(element).find('canvas').get(0);
            var width = v.videoWidth;
            var height = v.videoHeight;
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');

            scope.$watch('t', function (newValue) {
                if (newValue !== undefined) {
                    ctx.drawImage(v, 0, 0, width, height);
                }
            });

            scope.$watch('data.html', function (newValue) {
                $log.debug('html changed to', newValue);
            });

//            scope.$watch('data.start', function (newValue, oldValue) {
//
//            });
//
//            scope.$watch('data.end', function (newValue, oldValue) {
//
//            });

            scope.oldStart = scope.data.start;
            scope.oldEnd = scope.data.end;

            /**
             * Manage the snapshot duration input changing.
             */
            scope.changed = {
                startChanged: function () {
                    hiddenVideo.duration(function (duration) {
                        var newValue = scope.data.start;
                        if (isFloat(newValue)) {
                            newValue = parseFloat(newValue);
                            scope.data.start = newValue;
                            $log.debug('start changed to', newValue);
                            if (newValue < 0) {
                                $log.debug(newValue + ' is less than start, therefore reverting');
                                scope.data.start = 0;
                            }
                            else if (newValue > scope.data.end) {
                                $log.debug(newValue + ' is greater than end, therefore reverting');
                                scope.data.start = scope.oldStart;
                            }
                            else if (newValue > duration) {
                                $log.debug(newValue + ' is greater than video time of ' + duration + ' , therefore reverting');
                                scope.data.start = scope.oldStart;
                            }
                            else {
                                $log.debug(newValue + ' is acceptable');
                                scope.oldStart = scope.data.start;
                                hiddenVideo.moveTo(scope.data.start, function () {
                                    ctx.drawImage(v, 0, 0, width, height);
                                });
                            }
                        }
                        else {
                            $log.debug(newValue + ' is not a float, therefore reverting');
                            scope.data.start = scope.oldStart;
                        }
                    });
                },
                endChanged: function () {
                    hiddenVideo.duration(function (duration) {
                        var newValue = scope.data.end;

                        if (isFloat(newValue)) {
                            newValue = parseFloat(newValue);
                            scope.data.end = newValue;
                            $log.debug('end changed to', newValue);
                            if (newValue < scope.data.start) {
                                $log.debug(newValue + ' is less than start, therefore reverting');
                                scope.data.end = scope.oldEnd;
                            }
                            else if (newValue > duration) {
                                $log.debug(newValue + ' is greater than video time of ' + duration + ' , therefore reverting');
                                scope.data.end = scope.oldEnd;
                            }
                            else {
                                $log.debug(newValue + ' is acceptable');
                                scope.oldEnd = scope.data.end;
                            }
                        }
                        else {
                            $log.debug(newValue + ' is not a float, therefore reverting');
                            scope.data.end = scope.oldEnd;
                        }
                    });
                }
            };

            var editor = $(element).find('.editor');

            var penOptions = {
                editor: editor.get(0),
                class: 'pen',
                debug: false,
                list: [
                    'h1', 'h2', 'h3', 'blockquote', 'p', 'insertorderedlist', 'insertunorderedlist',
                    'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
                ],
                stay: false
            };
            var editingEnabled = scope.editor || false;
            if (editingEnabled) {
//                new Pen(penOptions);
                $('.editor').summernote({
                    airMode: true,
                    toolbar: [
                        ['style', ['style']],
                        ['style', ['bold', 'italic', 'underline', 'clear']],
                        ['fontsize', ['fontsize']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['insert', ['link']]
                    ]
                });
            }

            editor.focusout(function () {
                var html = editor.html();
                html = html.trim();
                if (html == '<br>' || html === '') {
                    editor.html('<div>Add your notes here.</div>');
                }

                $log.debug('snapshot is now ', scope.data);
            });


            scope.saveHTML = function (event) {
                var html = $sce.trustAsHtml(event.target.innerHTML);
                $log.debug('snapshot now has html:', html);
                scope.data.html = html;
            };

        }

        return {
            link: link,
            restrict: 'A',
            controller: controller,
            scope: {
                data: '=',
                editor: '=',
                onLoad: '='
            },
            templateUrl: 'snapshot/snapshot.tpl.html'

        };
    })
;