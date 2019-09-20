const app = angular.module('app', ['ngRoute', 'ngSanitize', 'googlechart'])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        })
        $routeProvider.when('/', { redirectTo: '/login' })
        $routeProvider.when('/contest', {
            controller: function ($location, $async, userService) {
                $async(function* () {
                    const problems = yield userService.problemsList()
                    $location.path(`/contest/${problems[0].name}`)
                })()
            }, template: ''
        })
        $routeProvider.when('/contest/:problemName', { controller: 'contestController', templateUrl: '/contest.html' })
        $routeProvider.when('/login', { controller: 'accountController', templateUrl: '/login.html' })
        $routeProvider.when('/admin', { controller: 'adminController', templateUrl: '/admin.html' })
        $routeProvider.when('/ranking', { controller: 'rankingController', templateUrl: '/ranking.html' })
        $routeProvider.otherwise({ redirectTo: '/' })
    })

app.controller('applicationController', function ($scope, $location, notificationService, userService) {
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

app.controller('contestController', function ($scope, $async, $routeParams, userService, notificationService) {
    window.mdc.autoInit()

    $scope.toggleDrawer = () => {
        const drawer = document.querySelector('.mdc-drawer')
        if (drawer.style.display == 'flex')
            drawer.style.display = 'none'

        drawer.style.display = 'flex'

    }
    $scope.refresh = $async(function* () {
        if (!$scope.problems)
            $scope.problems = yield userService.problemsList()

        for (let i = 0; i < $scope.problems.length; i++) {
            $scope.problems[i].solutions = yield userService.getSolutionsFor($scope.problems[i].name)
            if ($routeParams.problemName == $scope.problems[i].name)
                $scope.currentProblem = $scope.problems[i]
        }
    })
    $scope.refresh()
    let editor, editorContainer

    const fileInput = document.querySelector('input[type="file"]')
    fileInput.onchange = () => {
        if (fileInput.files.length) {
            const reader = new FileReader()
            reader.onload = () => {
                editor.setValue(reader.result)
            }
            reader.readAsText(fileInput.files[0])
        }
    }

    $scope.submit = () => {
        userService.submit($scope.currentProblem.name, editor.getValue(), editor.getModel().getModeId()).then(() => {
            $scope.refresh()
            notificationService.show('Wysłano rozwiązanie')
        }).catch((err) => {
            notificationService.show('Błąd przy wysłaniu rozwiązania')
            console.log(err)
        })
    }

    $scope.languages = [
        {
            name: 'C++',
            monacoName: 'cpp',
            codeSnippet: `#include <iostream>
using namespace std;

int main() {
	cout<<"Hello, World!";
	return 0;
}`
        },
        {
            name: 'C',
            monacoName: 'c',
            codeSnippet: `#include <stdio.h>

int main(void) {
    printf("Hello, World!");
    return 0;
}`
        },
        {
            name: 'Java',
            monacoName: 'java',
            codeSnippet: `import java.util.*;
import java.lang.*;
import java.io.*;

class Main
{
    public static void main (String[] args) throws java.lang.Exception
    {
        System.out.println("Hello, World!");
    }
}`
        },
        {
            name: 'Python',
            monacoName: 'python',
            codeSnippet: `print("Hello, World!")`
        }
    ]

    $scope.updateMonaco = (language) => {
        monaco.editor.setModelLanguage(editor.getModel(), language.monacoName)
        editor.setValue(language.codeSnippet)

    }

    $async(function* () {
        yield window.monacoLoaded
        editorContainer = document.getElementById('container')
        editor = monaco.editor.create(editorContainer, {
            value: $scope.languages[0].codeSnippet,
            language: $scope.languages[0].monacoName,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false
        })
        /*if (monaco.editor.getModels().length > 1) {
            editor.setModel(monaco.editor.getModels()[0])
            while (monaco.editor.getModels().length > 1)
                monaco.editor.getModels()[1].dispose()
        }*/

    })()

})

app.controller('adminController', function ($scope, $async, adminService) {
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

app.controller('accountController', function ($scope, userService, notificationService) {
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
    $scope.$on('login', () => {
        userService.amIAdmin().then(res => {
            $scope.admin = res
            $scope.$apply()
        })
    })

    userService.getMySolutions().then(solutions => {
        if (solutions.length == 0) return
        const effectivenessRows = Object.entries(solutions.reduce((previous, current) => {
            if (previous[current.result])
                previous[current.result]++
            else
                previous[current.result] = 1
            return previous
        }, {})).map(el => {
            return {
                c: [
                    { v: el[0] },
                    { v: el[1] }
                ]
            }
        })
        /*const activenessRows = Object.entries(solutions.reduce((previous, current) => {
            if (previous[new Date(current.time).toLocaleDateString()])
                previous[new Date(current.time).toLocaleDateString()]++
            else
                previous[new Date(current.time).toLocaleDateString()] = 1
            return previous
        }, {})).map(el => {
            return {
                c: [
                    { v: el[0] },
                    { v: el[1] }
                ]
            }
        })*/
        $scope.effectiveness = {
            type: 'PieChart',
            data: {
                cols: [
                    { id: 1, type: 'string' },
                    { id: 2, type: 'number' }
                ],
                rows: effectivenessRows
            },
            options: {
                title: 'Efektywność'
            },
        }
        $scope.$apply()
    })
})

app.controller('rankingController', function ($scope, userService) {
    window.mdc.autoInit()

    userService.getRanking().then(res => {
        $scope.problems = res.problems
        $scope.users = res.users
        $scope.$apply()
    })
})

app.service('userService', function ($http) {
    const userService = this
    this.amIAdmin = async function () {
        const res = await $http.get('/api/amiadmin')
        console.log(res)
        return res.data
    }
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
        await $http.delete('/api/logout')
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
    this.getSolutionsFor = async function (name) {
        const res = await $http.get(`/api/solutions/for/${encodeURIComponent(name)}`)
        return res.data
    }
    this.getMySolutions = async function () {
        const res = await $http.get('/api/solutions/my')
        return res.data
    }
})

app.service('adminService', function ($http) {
    this.getSolutions = async function () {
        const res = await $http.get('/api/solutions/all')
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
