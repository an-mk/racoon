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

app.controller('rankingController', function ($scope) {
    window.mdc.autoInit()
    $scope.problems = ['A', 'B', 'C']
    $scope.users = [
        {
            name: 'IA',
            points: 3,
            penalty: 120,
            problems: [{ attempts: 1, time: '1:10' }, { attempts: 2, time: '4:10' }, { attempts: 2 }]
        },
        {
            name: 'An',
            points: 3,
            penalty: 120,
            problems: [{ attempts: 1, time: '1:10' }, { attempts: 5, time: '4:10' }, { attempts: 0 }]
        },
        {
            name: 'AB',
            points: 3,
            penalty: 120,
            problems: [{ attempts: 1, time: '1:10' }, { attempts: 8 }, { attempts: 0 }]
        },
        {
            name: 'CA',
            points: 3,
            penalty: 120,
            problems: [{ attempts: 4 }, { attempts: 10 }, { attempts: 0 }]
        },
    ]
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