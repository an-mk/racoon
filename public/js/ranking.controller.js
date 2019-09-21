angular.module('app').controller('rankingController', function ($scope, miscService) {
    window.mdc.autoInit()

    miscService.getRanking().then(res => {
        $scope.problems = res.problems
        $scope.users = res.users
        $scope.$apply()
    })
})