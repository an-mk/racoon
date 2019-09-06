const app = angular.module('app', ['ngRoute'])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        })
        $routeProvider.when('/', { controller: 'contestController', templateUrl: 'contest.html' })
        $routeProvider.when('/login', { controller: 'loginController', templateUrl: 'login.html' })
        $routeProvider.when('/ranking', { controller: 'rankingController', templateUrl: 'ranking.html' })
    })

app.controller('applicationController', function ($scope, $location, notificationService, userService) {
    window.mdc.autoInit()

    $scope.$on('login', function (_, name) {
        $location.path('/')
        notificationService.show(`Witaj, ${name}`)
        $scope.currentUser = name
        $scope.$apply()
    })

    $scope.$on('logout', function () {
        $location.path('/login')
        notificationService.show('Wylogowano')
        $scope.currentUser = ''
        $scope.$apply()
    })

    userService.myName().then(name => $scope.$emit('login', name)).catch(() => $location.path('/login'))
})

app.controller('contestController', function () {
    window.mdc.autoInit()
})

app.controller('loginController', function ($scope, userService, notificationService) {
    window.mdc.autoInit()
    $scope.login = (name, pswd) => {
        userService.login(name, pswd).then(res => $scope.$emit('login', res))
            .catch(err => {
                console.error(err)
                notificationService.show('Nie udało się zalogować')
            })
    }
    $scope.register = (name, pswd) => {
        userService.register(name, pswd).then(res => $scope.$emit('login', res))
            .catch(err => {
                console.error(err)
                notificationService.show('Nie udało się zarejestrować')
            })
    }
    $scope.logout = () => {
        userService.logout()
        $scope.$emit('logout')
    }
})

app.controller('rankingController', function ($scope, $timeout, userService) {
    window.mdc.autoInit()

    userService.getRanking().then(res => {
        $scope.problems = res.problems
        $scope.users = res.users
        $scope.$apply()
    })
})

app.service('userService', function ($http) {

    this.myName = async function () {
        const res = await $http.get('/api/myname')
        return res.data
    }
    this.login = async function (name, pswd) {
        const res = await $http.post('/api/login', { name: name, pswd: pswd })
        if (res.status == 200) return name
        throw new Error(res.data)
    }
    this.register = async function (name, pswd) {
        const res = await $http.post('/api/users/create', { name: name, pswd: pswd })
        if (res.status == 201) return name
        throw new Error(res.data)
    }
    this.logout = async function () {
        const res = await $http.delete('/api/logout')
    }
    this.problemsList = async function () {
        const res = await $http.get('/api/problems/list')
        return res.data
    }
    this.getRanking = async function () {
        const res = await $http.get('/api/ranking')
        return res.data
    }
})

app.service('notificationService', function () {
    const MDCSnackbar = mdc.snackbar.MDCSnackbar
    const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'))
    snackbar.timeoutMs = 4000
    this.show = async function (str) {
        snackbar.close()
        snackbar.labelText = str
        console.log(str);
        snackbar.open()
    }
})