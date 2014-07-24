angular.module('app.feedback.addFeedback', [
    'ui.router',
    'app.resources',
    'summernote'
])

    .config(function config($stateProvider) {
        $stateProvider.state('addFeedback', {
            url: '/feedback/add/:Id',
            views: {
                "main": {
                    controller: 'AddFeedbackCtrl',
                    templateUrl: 'feedback/add/addFeedback.tpl.html'
                }
            },
            data: { pageTitle: 'Give Feedback' }
        });
    })

    .controller('AddFeedbackCtrl', function ($scope, api, Feedback, $log, errors,
                                             $stateParams, $state, $upload, $cookies) {
        var id = $stateParams.Id;

        /**
         * Returns true if we have enough information to display the feedback form.
         * @returns {boolean}
         */
        var shouldDisplay = function () {
            if (this.id) {
                var title = $scope.feedback.title || '';
                var description = $scope.feedback.description || '';
                if (!title.length && !description.length) {
                    return false;
                }
            }
            return true;
        };

        if (id) {
            $log.debug('Editing existing feedback, fetching');
            $scope.feedback = Feedback.get({Id: id}, function () {
                $log.debug('Editing existing feedback, fetched');
                _.bind(shouldDisplay, $scope.feedback);
                $scope.feedback.shouldDisplay = shouldDisplay;
            });
        }
        else {
            $scope.feedback = new Feedback({
                title: '',
                description: ''
            });
            _.bind(shouldDisplay, $scope.feedback);
            $scope.feedback.shouldDisplay = shouldDisplay;
        }


        $scope.feedbackResource = null;


        $scope.summernoteOptions = {
            toolbar: [
                ['style', ['style']],
                ['style', ['bold', 'italic', 'underline', 'clear']],
                ['fontsize', ['fontsize']],
                ['color', ['color']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['insert', [ 'link', 'picture']]
            ]
        };

        $scope.submit = function () {
            var title = $scope.feedback.title;
            var desc = $scope.feedback.description;
            if (!title.length) {
                $scope.error = 'Must provide a title';
            }
            else if (!desc.length) {
                $scope.error = 'Must provide some feedback';
            }
            else {
                var onSuccess = function () {
                    $state.go('feedback');
                };
                var onFail = function (res) {
                    errors.serverErrorFromResult(res);
                };
                if (!$scope.feedback.id) {
                    $scope.feedback.$save().then(onSuccess, onFail);
                }
                else {
                    console.log('Feedback:',$scope.feedback);
                    $scope.feedback.$update().then(onSuccess, onFail);
                }
            }
        };

        $scope.imageUpload = function imageUpload(files, editor, welEditable) {
            var progress = function (evt) {
                var i = 100.0 * evt.loaded / evt.total;
                console.log('percent: ' + parseInt(i, 10));
            };
            var success = function (data, status, headers, config) {
                if (status >= 300 || status < 200) {
                    $log.error('Error uploading image:', status, data);
                }
                else {
                    var sUrl = data.image_url;
                    $log.debug('Inserting image with url:', sUrl);
                    editor.insertImage(welEditable, sUrl);
                }
            };
            var uploadOptions = {
                url: '/api/feedback_attachments/',
                method: 'POST',
                headers: {'X-CSRFToken': $cookies['csrftoken']},
                withCredentials: true,
                fileFormDataName: 'image'
            };
            for (var i=0; i<files.length;i++) {
                uploadOptions.file = files[i];
                $upload.upload(uploadOptions).progress(progress).success(success);
            }

        };
    })

;
