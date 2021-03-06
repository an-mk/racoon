angular.module('app', ['ngRoute', 'ngSanitize', 'googlechart'])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        })
        $routeProvider.when('/', { redirectTo: '/login' })
        $routeProvider.when('/contest', {
            controller: function ($location, $async, userService) {
                $async(function* () {
                    const problem = yield userService.problemsFirst()
                    $location.path(`/contest/${problem.name}`)
                })()
            }, template: ''
        })
        $routeProvider.when('/contest/:problemName', { controller: 'contestController', templateUrl: '/contest.html' })
        $routeProvider.when('/login', { controller: 'accountController', templateUrl: '/login.html' })
        $routeProvider.when('/admin', { controller: 'adminController', templateUrl: '/admin.html' })
        $routeProvider.when('/ranking', { controller: 'rankingController', templateUrl: '/ranking.html' })
        $routeProvider.otherwise({ redirectTo: '/' })
    })