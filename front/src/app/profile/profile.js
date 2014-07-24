angular.module('app.profile', [
    'ui.router',
    'angularFileUpload',
    'contentEditable'
])

    .config(function config($stateProvider) {
        $stateProvider.state('profile', {
            url: '/profile/:Id/',
            views: {
                "main": {
                    controller: 'ProfileCtrl',
                    templateUrl: 'profile/profile.tpl.html'
                }
            },
            data: { pageTitle: 'Profile' }
        });
    })

    .controller('ProfileCtrl', function ProfileCtrl($scope, $stateParams, $state, AuthService, $upload, $cookies, errors, $log, dates, Feedback, modalFactory, User, $rootScope) {
        $scope.id = $stateParams.Id;
        if ($scope.id) {
            User.get({Id: $scope.id}, function success(user) {
                $log.debug('Got user with id ' + $scope.id + ':', user);
                $scope.user = user;
            }, function failure(res) {
                errors.serverErrorFromResult(res);
            });
        }
        else {
            $scope.$watch('currentUser', function () {
                if ($scope.currentUser) {
                    $scope.id = $scope.currentUser.id;
                    $scope.user = $scope.currentUser;
                }
            });
        }

        $scope.feedbackPagination = {
            count: 0,
            currentPage: 1
        };

        $scope.onFileSelect = function ($files) {
            var file = $files[0];
            $scope.upload = $upload.upload({
                url: '/api/users/' + $scope.user.id + '/', //upload.php script, node.js route, or servlet url
                method: 'PUT',
                headers: {'X-CSRFToken': $cookies['csrftoken']},
                withCredentials: true,
                data: $scope.user,
                file: file,
                fileFormDataName: 'profile_photo'
            }).progress(function (evt) {
                var i = 100.0 * evt.loaded / evt.total;
                console.log('percent: ' + parseInt(i, 10));
            }).success(function (data, status, headers, config) {
                if (status >= 300 || status < 200) {
                    errors.serverErrorFromResult(config);
                }
                else {
                    $scope.user.profile_photo_url = data.profile_photo_url;
                    console.log(data);
                }
            });
        };

        var pageSize = 5;

        function getFeedback(page, user) {
            Feedback.list({page: page, page_size: 5, user: user.id}, function (x) {
                $scope.feedback = x.results;
                $scope.feedbackPagination.count = x.count;
//                $scope.feedbackPagination.numPages = Math.ceil($scope.count / 10.0);
                $log.debug('Feedback pagination:', $scope.feedbackPagination, $scope.feedback);
            }, function fail(res) {
                errors.serverErrorFromResult(res);
            });
        }

        $scope.$watch('user', function (newValue) {
            var user = $scope.user;
            if (user) {
                getFeedback(1, user);
            }
        });

        /**
         * Fired when paginator page is pressed.
         */
        $scope.feedbackPageChanged = function () {
            var page = $scope.feedbackPagination.currentPage;
            $log.debug('Getting feedback page:', page);
            getFeedback(page, $scope.user);
        };


        /**
         * Generic function for changing a user field.
         * @param field
         * @param newValue
         * @param callback
         */
        function changeUserField(field, newValue, callback) {
            var user = $scope.user;
            var oldValue = user[field];
            if (newValue.trim().length) {
                $log.debug('New ' + field + ' is:', newValue);
                user[field] = newValue;
                $log.debug('Remote updating ' + field + ' for user:', user);
                user.$update().then(function success() {
                    if (callback) {
                        callback();
                    }
                }, function fail(res) {
                    errors.serverErrorFromResult(res);
                    user[field] = oldValue;
                    if (callback) {
                        callback(res);
                    }
                });
            }
            else {
                var err = field + ' invalid';
                errors.addWarning(err);
                if (callback) {
                    callback(err);
                }
            }
        }


        /**
         * Returns true if it's the current users profile.
         * @returns {boolean}
         */
        $scope.editable = function () {
            if ($scope.currentUser) {
                var currentUserId = $scope.currentUser.id;
                var profileId = $scope.id;
                $log.debug(currentUserId, profileId);
                return currentUserId == profileId;
            }
            else {
                $log.debug('no current user');
            }
            return false;
        };

        /**
         * Fired off when the username is changed via contentEditable
         * @param n
         * @param o
         * @param elem
         */
        $scope.usernameChanged = function (n, o, elem) {
            var oldUsername = $scope.user.username;

            modalFactory.open('Your old username will be made available for others to use.', function () {
                changeUserField('username', n, function finished(err) {
                    if (err) {
                        $log.debug('Error when changing username, so changing it back to ' + oldUsername, elem);
                        $(elem).text(oldUsername);
                    }
                });
            }, function () {
                $log.debug('Cancelled username change, so changing it back to ' + oldUsername, elem);
                $(elem).text(oldUsername);
                // TODO: Change back.
            });
        };

        /**
         * Fired off when the email is changed via contentEditable.
         * @param n
         * @param o
         * @param elem
         */
        $scope.emailChanged = function (n, o, elem) {
            var oldEmail = $scope.user.email;
            modalFactory.open(null, function () {
                changeUserField('email', n);
            }, function () {
                $(elem).text(oldEmail);
            });
        };

        /**
         * Fired off when users name is changed via contentEditable
         * @param n
         * @param o
         * @param elem
         */
        $scope.nameChanged = function (n, o, elem) {
            var oldName = $scope.user.name;
            modalFactory.open(null, function () {
                changeUserField('name', n);
            }, function () {
                $(elem).text(oldName);
            });
        };

    })

;
