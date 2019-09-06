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
        $scope.$apply()
    })

    userService.myName().then(name => $scope.$emit('login', name)).catch(() => $location.path('/login'))
})

app.controller('contestController', function ($scope, $timeout) {
    window.mdc.autoInit()

    $scope.toggleDrawer = () => {
        const drawer = document.querySelector('.mdc-drawer')
        if (drawer.style.display == 'flex')
            drawer.style.display = 'none'
        else
            drawer.style.display = 'flex'
    }
    $scope.problems = [{
        name: 'Suma',
        content: '<p>Zsumuj a i b. </p> <b>Przykładowe wejście:</b> <code>a = 2 \nb = 10 </code> <b>Przykładowe wyjście:</b> <code>12</code>'
    },
    {
        name: 'B',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin nibh augue, suscipit a, scelerisque sed, lacinia in, mi. Cras vel lorem. Etiam pellentesque aliquet tellus. Phasellus pharetra nulla ac diam. Quisque semper justo at risus. Donec venenatis, turpis vel hendrerit interdum, dui ligula ultricies purus, sed posuere libero dui id orci. Nam congue, pede vitae dapibus aliquet, elit magna vulputate arcu, vel tempus metus leo non est. Etiam sit amet lectus quis est congue mollis. Phasellus congue lacus eget neque. Phasellus ornare, ante vitae consectetuer consequat, purus sapien ultricies dolor, et mollis pede metus eget nisi. Praesent sodales velit quis augue. Cras suscipit, urna at aliquam rhoncus, urna quam viverra nisi, in interdum massa nibh nec erat.'
    }]
    $scope.currentProblem = $scope.problems[0]
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
    $scope.submit = console.log

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