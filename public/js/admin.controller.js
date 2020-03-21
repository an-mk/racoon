angular.module('app').controller('adminController', function ($scope, $async, adminService, notificationService) {
    window.mdc.autoInit()
    $scope.content = ''
    $scope.searchKeyword = ''
    $scope.currentCheckEnv = { name: '' }
    $scope.checkerCode = ''
    $scope.problemName = ''

    $scope.cl = x => console.log(x)

    $scope.refresh = $async(function* () {
        $scope.solutions = yield adminService.getSolutions()
        $scope.checkEnvs = yield adminService.getCheckEnvs()
        if ($scope.checkEnvs.length)
            $scope.currentCheckEnv.name = $scope.checkEnvs[0].name
        // TODO wyświetlić czytelny komunikat o braku checkenv i co zrobić
    })
    $scope.refresh()

    $scope.addProblem = $async(function* () {
        const result = yield adminService.addProblem($scope.problemName, $scope.content, $scope.currentCheckEnv.name, $scope.checkerCode)
        if (result == 201) {
            notificationService.show(`Dodawanie zadania ${$scope.problemName} udało się`)
            $scope.problemName = ''
            $scope.content = ''
            $scope.checkerCode = ''
        }
        else notificationService.show(`Dodawanie zadania ${$scope.problemName} nie udało się`)
    })

    $scope.addTest = $async(function* () {
        const fileInput = document.querySelector('input[type="file"]')
        if (fileInput.files.length == 0) {
            notificationService.show(`Nie wybrano żadnego pliku`)
            return;
        }
        const result = yield adminService.addTest($scope.nameB, fileInput.files[0])
        if (result == 'OK') notificationService.show(`Dodawanie testu ${$scope.nameB} udało się`)
        else notificationService.show(`Dodawanie testu ${$scope.nameB} nie udało się`)
    })

    $scope.comparator = (solution) => {
        const objStr = Object.entries(solution).reduce((acc, el) => `${acc} ${el[1]}`, '') + ' ' + $scope.toLocaleString(solution.time)
        return $scope.searchKeyword.split(/\s+/).every(el => objStr.includes(el))
    }
})