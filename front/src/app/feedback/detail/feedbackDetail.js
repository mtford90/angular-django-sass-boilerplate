angular.module('app.feedback.feedbackDetail', [
    'ui.router',
    'app.resources'
])

    .config(function config($stateProvider) {
        $stateProvider.state('feedbackDetail', {
            url: '/feedback/detail/:Id',
            views: {
                "main": {
                    controller: 'FeedbackDetailCtrl',
                    templateUrl: 'feedback/detail/feedbackDetail.tpl.html'
                }
            },
            data: { pageTitle: 'Give Feedback' }
        });
    })

    .controller('FeedbackDetailCtrl', function ($scope, $stateParams, Feedback, Vote, jlog,
                                                $rootScope, errors, $sce, $state, Comment, dates) {

        var $log = jlog.loggerWithName('feedback');

        var feedbackId = $stateParams.Id;
        $scope.feedback = null;
        $scope.comments = [];

        function initComment() {
            $scope.comment = new Comment({message: '', feedback: feedbackId, user: $scope.currentUser});
        }

        initComment();

        $scope.votes = {
            ready: function () {
                return this.numUpVotes !== undefined &&
                    this.numDownVotes !== undefined &&
                    this.currentUserVotes !== undefined;
            },
            userUpVoted: function () {
                var currentUserVotes = this.currentUserVotes;
                return currentUserVotes ? currentUserVotes.up === true : false;
            },
            userDownVoted: function () {
                var currentUserVotes = this.currentUserVotes;
                return currentUserVotes ? currentUserVotes.up === false : false;
            },
            userHasVoted: function () {
                return this.currentUserVotes !== null;
            }
        };

        $scope.commentCount = null;

        $scope.currentPage = 1;

        $scope.numCommentsRemaining = function () {
            if ($scope.comments) {
                return $scope.commentCount - $scope.comments.length;
            }
            else {
                return null;
            }
        };

        $scope.feedback = Feedback.get({Id: feedbackId}, function () {
            $scope.feedback.html = $sce.trustAsHtml($scope.feedback.description);
            var currentUserVotes = Vote.query({
                'user': $scope.currentUser.id,
                'feedback': $scope.feedback.id
            }, function () {
                if (currentUserVotes.length > 1) {
                    $log.error('>1 votes against feedback from one user. This should never happen');
                }
                $scope.votes.currentUserVotes = currentUserVotes.length ? currentUserVotes[0] : null;
            });
        });

        var numUpVotes = Vote.count({
            'page_size': 0,
            'up': 'True',
            'feedback':feedbackId
        }, function () {
            console.log(numUpVotes);
            $scope.votes.numUpVotes = numUpVotes.count;
        });
        var numDownVotes = Vote.count({
            'page_size': 0,
            'up': 'False',
            'feedback': feedbackId
        }, function () {
            $scope.votes.numDownVotes = numDownVotes.count;
        });


        $scope.upVote = function () {
            var vote;
            if (!$scope.votes.userHasVoted()) {
                $log.debug('User hasnt voted before. Creating new up vote');
                vote = new Vote({
                    'up': true,
                    'user': $scope.currentUser.id,
                    'feedback': $scope.feedback.id
                });
                vote.$save(function () {
                    $log.debug('Vote saved:', vote);
                });
                $scope.votes.currentUserVotes = vote;
                $scope.votes.numUpVotes++;
            }
            else if ($scope.votes.userUpVoted()) {
                $log.debug('User has upvoted and clicked again. Deleting up vote');
                vote = $scope.votes.currentUserVotes;
                vote.$delete().then(function () {
                    $log.debug('delete success');
                }, function (res) {
                    errors.serverErrorFromResult(res);
                    $scope.votes.currentUserVotes = vote;
                    $scope.votes.numUpVotes++;
                });
                $scope.votes.currentUserVotes = null;
                $scope.votes.numUpVotes--;
            }
            else {
                $log.debug('Ignoring click');
            }
        };

        $scope.downVote = function () {
            if (!$scope.votes.userHasVoted()) {
                $log.debug('User hasnt voted before. Creating new down vote');
                vote = new Vote({
                    'up': false,
                    'user': $scope.currentUser.id,
                    'feedback': $scope.feedback.id
                });
                vote.$save(function () {
                    $log.debug('Vote saved:', vote);
                });
                $scope.votes.currentUserVotes = vote;
                $scope.votes.numDownVotes++;
            }
            else if ($scope.votes.userDownVoted()) {
                $log.debug('User has downvoted and clicked again. Deleting down vote');
                $log.debug('User has upvoted and clicked again. Deleting up vote');
                vote = $scope.votes.currentUserVotes;
                vote.$delete().then(function () {
                    $log.debug('delete success');
                }, function (res) {
                    errors.serverErrorFromResult(res);
                    $scope.votes.currentUserVotes = vote;
                    $scope.votes.numDownVotes++;
                });
                $scope.votes.currentUserVotes = null;
                $scope.votes.numDownVotes--;
            }
            else {
                $log.debug('Ignoring click');
            }
        };

        $scope.deleteFeedback = function () {
            var onSuccessDelete = function () {
                $state.go('feedback');
            };
            var onFailDelete = function (res) {
                errors.serverErrorFromResult(res);
            };
            $scope.feedback.$delete().then(onSuccessDelete, onFailDelete);
        };

        $scope.addComment = function () {
            var comment = $scope.comment;
            initComment();
            comment.dateStr = dates.shortDate(new Date());
            $scope.comments.unshift(comment);
            comment.$save(function () {
                $log.debug('Successfully saved comment');
            }, function (res) {
                errors.serverErrorFromResult(res);
            });
        };

        $scope.deleteComment = function (idx) {
            var comment = $scope.comments[idx];
            $scope.comments.splice(idx, 1);
            comment.$delete().then(function () {

            }, function (res) {
                errors.serverErrorFromResult(res);
            });
        };

        $scope.commentChanged = function (newComment, oldComment, elem, commentObj) {
            $log.debug('commentChanged', newComment, oldComment, elem, commentObj);
            var trimmedComment = newComment.trim();
            if (trimmedComment.length) {
                commentObj.message = trimmedComment;
                commentObj.$update(function success() {
                    $log.debug('Successfully updated comment');
                }, function failure(res) {
                    $log.error('Error saving comment');
                    errors.serverErrorFromResult(res);
                    $(elem).text(oldComment);
                });
            }
            else {
                $log.debug('Comment cannot be empty');
                $(elem).text(oldComment);
            }
        };

        function getPage(page) {
            var opts = {
                feedback: feedbackId,
                ordering: '-created_at',
                page: page,
                page_size: 5
            };
            // Need to specify a date for pagination to work whilst new comments are being added.
            if ($scope.comments.length) {
                opts.dt = Date.parse($scope.comments[0].created_at);
            }
            var comments = Comment.query(opts, function () {
                if (comments.length) {
                    $scope.commentCount = comments[0].count;
                }
                for (var idx in comments) {
                    var comment = comments[idx];
                    $log.debug(comment);
                    var createdAt = comment.created_at;
                    var date;
                    if (createdAt) {
                        if (createdAt.getYear) {
                            date = createdAt;
                        }
                        else {
                            var parsedDate = Date.parse(createdAt);
                            date = new Date(parsedDate);
                        }
                    }
                    comment.dateStr = dates.shortDate(date);
                }
                $scope.comments = $scope.comments.concat(comments);
            }, function (res) {
                errors.serverErrorFromResult(res);
            });
        }

        getPage(1);

        $scope.getNextPage = function () {
            $scope.currentPage += 1;
            getPage($scope.currentPage);
        };

    })

;
