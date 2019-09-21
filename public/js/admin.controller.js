angular.module('app').controller('adminController', function ($scope, $async, adminService) {
    window.mdc.autoInit()
    $scope.searchKeyword = ''

    $scope.refresh = $async(function* () {
        $scope.solutions = yield adminService.getSolutions()
    })
    $scope.refresh()

    $scope.comparator = (actual) => {
        const objStr = Object.entries(actual).reduce((acc, el) => acc + ' ' + el[1], '')
        return $scope.searchKeyword.split(/\s+/).every(el => objStr.includes(el))
    }
})