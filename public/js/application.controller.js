angular.module('app').controller('applicationController', function ($scope, $location, notificationService, userService) {
    window.mdc.autoInit()

    $scope.$on('login', function (_, name) {
        notificationService.show(`Witaj, ${name}`)
        $scope.currentUser = name
        $scope.$apply()
    })

    $scope.$on('logout', function () {
        notificationService.show('Wylogowano')
        $scope.currentUser = ''
    })

    userService.myName().then(name => $scope.$emit('login', name)).catch(() => { })

    $scope.toLocaleTimeString = number => new Date(number).toLocaleTimeString()
    $scope.toLocaleString = number => new Date(number).toLocaleString()
})
