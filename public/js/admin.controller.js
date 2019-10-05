angular.module('app').controller('adminController', function ($scope, $async, adminService, notificationService) {
    window.mdc.autoInit()
    $scope.searchKeyword = ''

    $scope.refresh = $async(function* () {
        $scope.solutions = yield adminService.getSolutions()
    })
    $scope.refresh()

    $scope.addProblem = $async(function* () {
        const result = yield adminService.addProblem($scope.nameA, $scope.content)
        if (result == 'OK')
        {
            notificationService.show(`Dodawanie zadania ${$scope.nameA} udało się`)
            $scope.nameA = ''
            $scope.content = ''
        }
        else notificationService.show(`Dodawanie zadania ${$scope.nameA} nie udało się`)
    })

    $scope.addTest = $async(function* () {
        const fileInput = document.querySelector('input[type="file"]')
        if (fileInput.files.length == 0)
        {
            notificationService.show(`Nie wybrano żadnego pliku`)
            return;
        }
        const result = yield adminService.addTest($scope.nameB, fileInput.files[0])
        if (result == 'OK') notificationService.show(`Dodawanie testu ${$scope.nameB} udało się`)
        else notificationService.show(`Dodawanie testu ${$scope.nameB} nie udało się`)
    })

    $scope.comparator = (actual) => {
        const objStr = Object.entries(actual).reduce((acc, el) => acc + ' ' + el[1], '')
        return $scope.searchKeyword.split(/\s+/).every(el => objStr.includes(el))
    }
})