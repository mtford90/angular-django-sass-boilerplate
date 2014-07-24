/**
 * Each section of the site has its own module. It probably also has
 * submodules, though this boilerplate is too simple to demonstrate it. Within
 * `src/app/home`, however, could exist several additional folders representing
 * additional modules that would then be listed as dependencies of this one.
 * For example, a `note` section could have the submodules `note.create`,
 * `note.delete`, `note.edit`, etc.
 *
 * Regardless, so long as dependencies are managed correctly, the build process
 * will automatically take take of the rest.
 *
 * The dependencies block here is also where component dependencies should be
 * specified, as shown below.
 */
angular.module('app.home', [
    'ui.router',
    'app',
    'ui.bootstrap'
])

/**
 * Each section or module of the site can also have its own routes. AngularJS
 * will handle ensuring they are all available at run-time, but splitting it
 * this way makes each module more "self-contained".
 */
    .config(function config($stateProvider) {
        $stateProvider.state('home', {
            url: '/home',
            views: {
                "main": {
                    controller: 'HomeCtrl',
                    templateUrl: 'home/home.tpl.html'
                }
            },
            data: { pageTitle: 'Home' }
        });
    })

/**
 * And of course we define a controller for our route.
 */
    .controller('HomeCtrl', function HomeController($scope, api, $log, Breakdown, errors, loading) {


        $scope.breakdowns = [];
        $scope.count = 0;
        $scope.numPages = 0;
        $scope.currentPage = 1;

        function constructBreakdown(breakdown, err, data) {
            if (!err) {
                var thumbnails = data.thumbnails;
                if (thumbnails) {
                    var chosenThumbnail = {area: 0};
                    for (var i = 0; i < thumbnails.length; i++) {
                        var t = thumbnails[i];
                        var height = t.height || 0;
                        var width = t.width || 0;
                        var area = height * width;
                        if (area > chosenThumbnail.area) {
                            chosenThumbnail = {url: t.url, area: area};
                        }
                    }
                    if (chosenThumbnail.url) {
                        breakdown.thumbnail = chosenThumbnail.url;
                    }
                    else {
                        // TODO: Place error somewhere?
                    }

                }
                else {
                    // TODO: Place error somewhere?
                }

            }
            else {
                // TODO: Place error somewhere?
            }
        }

        $scope.$watch('breakdowns', function () {
            var chunks = [];
            var currentChunk;
            var list = $scope.breakdowns;
            for (var i = 0; i < list.length; i++) {
                if (i % 3 === 0) {
                    currentChunk = [];
                    chunks.push(currentChunk);
                }
                currentChunk.push(list[i]);
            }
            $scope.chunkedBreakdowns = chunks;
        }, true);

        function getBreakdowns(page) {
            var pageSize = 3;
            var breakdowns = Breakdown.list({
                page_size: pageSize,
                page: page,
                ordering: '-created_at'
            }, function () {
                $scope.breakdowns = [];
                $scope.count = breakdowns.count;
                $scope.numPages = Math.ceil($scope.count / pageSize);
                for (var i = 0; i < breakdowns.results.length; i++) {
                    var b = breakdowns.results[i];
                    api.youtubeMetaData(b.url, _.partial(constructBreakdown, b));
                    $scope.breakdowns.push(b);
                }
            }, function (res) {
                errors.serverErrorFromResult(res);
            });
        }

        $scope.pageChanged = function (page) {
            getBreakdowns(page);
        };

        getBreakdowns(1);

    })

;
