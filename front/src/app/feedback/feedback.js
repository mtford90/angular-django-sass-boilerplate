angular.module('app.feedback', [
    'ui.router',
    'app.resources'
])

    .config(function config($stateProvider) {
        $stateProvider.state('feedback', {
            url: '/feedback',
            views: {
                "main": {
                    controller: 'FeedbackCtrl',
                    templateUrl: 'feedback/feedback.tpl.html'
                }
            },
            data: { pageTitle: 'Give Feedback' }
        });
    })

/**
 * And of course we define a controller for our route.
 */
    .controller('FeedbackCtrl', function HomeController($scope, api, Feedback, jlog) {
        var $log = jlog.loggerWithName('feedback');

        $scope.feedback = [];
        $scope.count = 0;
        $scope.numPages = 0;
        $scope.currentPage = 1;

        Feedback.list({ordering: '-num_votes,-num_comments,-created_at'},function (x) {
            $scope.feedback = x.results;
            $scope.count = x.count;
            $scope.numPages = Math.ceil($scope.count / 10.0);
        });


        $scope.pageChanged = function () {
            $log.trace('Page changed to: ' + $scope.currentPage);
            var feedbackPromise = Feedback.list({page: $scope.currentPage, ordering: '-num_votes,-num_comments,-created_at'}, function (x) {
                $scope.feedback = x.results;
                $scope.count = x.count;
                $scope.numPages = Math.ceil($scope.count / 10.0);
            });
        };

    })


;
