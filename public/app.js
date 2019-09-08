const app = angular.module('app', ['ngRoute', 'ngSanitize'])
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
    })

    userService.myName().then(name => $scope.$emit('login', name)).catch(() => $location.path('/login'))
})

app.controller('contestController', function ($scope, $timeout, $async, userService, notificationService) {
    window.mdc.autoInit()

    $scope.toggleDrawer = () => {
        const drawer = document.querySelector('.mdc-drawer')
        if (drawer.style.display == 'flex')
            drawer.style.display = 'none'
        else
            drawer.style.display = 'flex'

    }
    $async(function* () {
        $scope.problems = yield userService.problemsList()
        $scope.currentProblem = $scope.problems[0]
    })()
    $scope.setCurrentProblem = pr => $scope.currentProblem = pr
    $scope.code = ''
    $timeout(() => {
        window.mdc.autoInit()
        const fileInput = document.querySelector('input[type="file"]')
        fileInput.onchange = () => {
            if (fileInput.files.length) {
                const reader = new FileReader()
                reader.onload = () => {
                    $scope.code = reader.result
                    $scope.$apply()
                    const textarea = document.querySelector('textarea')
                    textarea.focus()
                    textarea.oninput()
                }
                reader.readAsText(fileInput.files[0])
            }
        }
    }, 0)
    $scope.submit = (source) => {
        userService.submit($scope.currentProblem.name, source).then((data) => {
            //TODOl
            notificationService.show('Wysłano rozwiązanie')
        }).catch((err) => {
            notificationService.show('Błąd przy wysłaniu rozwiązania')
            console.log(err)
        })
    }
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
    const userService = this
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
        if (res.status == 201) return await userService.login(name, pswd)
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
    this.submit = async function (problem, code) {
        const res = await $http.post('/api/submit', { problem: problem, code: code })
        if (res.status == 201) return res.data
        throw new Error(res.data)
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

// Code from https://github.com/Magnetme/ng-async

app.factory('$async', ['$q', ($q) => {
    return generator => {
        return function (...args) {
            return $q((resolve, reject) => {
                let it;
                try {
                    it = generator.apply(this, args);
                } catch (e) {
                    reject(e);
                    return;
                }
                function next(val, isError = false) {
                    let state;
                    try {
                        state = isError ? it.throw(val) : it.next(val);
                    } catch (e) {
                        reject(e);
                        return;
                    }

                    if (state.done) {
                        resolve(state.value);
                    } else {
                        $q.when(state.value)
                            .then(next, err => {
                                next(err, true);
                            });
                    }
                }
                //kickstart the generator function
                next();
            });
        }
    }
}]);
