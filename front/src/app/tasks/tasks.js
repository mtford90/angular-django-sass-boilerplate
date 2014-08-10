angular.module('app.tasks', [
    'ui.router',
    'app',
    'ui.bootstrap'
])

    .config(function config($stateProvider) {
        $stateProvider.state('tasks', {
            url: '/tasks',
            views: {
                "main": {
                    controller: 'TasksCtrl',
                    templateUrl: 'tasks/tasks.tpl.html'
                }
            },
            data: { pageTitle: 'Tasks' }
        });
    })

    .controller('TasksCtrl', function TasksController($scope, $log) {



    })

;
