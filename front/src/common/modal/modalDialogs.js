angular.module('app')


    .factory('modalFactory', function ($modal) {
        return {
            open: function (message, positiveCallback, negativeCallback) {
                var content = 'modal/modalDialogs.tpl.html';
                var $modalInstance;
                var ModalInstanceCtrl = function ($scope, $modalInstance) {
                    $scope.message = message;
                    $scope.ok = function () {
                        if (positiveCallback) {
                            positiveCallback();
                        }
                        $modalInstance.dismiss();
                    };

                    $scope.cancel = function () {
                        if (negativeCallback) {
                            negativeCallback();
                        }
                        $modalInstance.dismiss();
                    };
                };
                $modalInstance = $modal.open({
                    templateUrl: content,
                    controller: ModalInstanceCtrl,
                    size: 'sm'
                });
            }
        };
    })

;

