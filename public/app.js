const app = angular.module('app', ['ngRoute', 'ngSanitize'])
    .config(function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
            requireBase: false
        })
        $routeProvider.when('/', { redirectTo: '/contest' })
        $routeProvider.when('/contest', {
            controller: function ($location, $async, userService) {
                $async(function* () {
                    const problems = yield userService.problemsList()
                    $location.path(`/contest/${problems[0].name}`)
                })()
            }, template: ''
        })
        $routeProvider.when('/contest/:problemName', { controller: 'contestController', templateUrl: '/contest.html' })
        $routeProvider.when('/login', { controller: 'loginController', templateUrl: '/login.html' })
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

app.controller('contestController', function ($scope, $location, $async, $routeParams, userService, notificationService) {
    window.mdc.autoInit()

    $scope.toggleDrawer = () => {
        const drawer = document.querySelector('.mdc-drawer')
        if (drawer.style.display == 'flex')
            drawer.style.display = 'none'
        else
            drawer.style.display = 'flex'

    }
    $scope.refresh = $async(function* () {
        if (!$scope.problems)
            $scope.problems = yield userService.problemsList()

        if (!$routeParams.problemName) {
            $location.path(`/contest/${$scope.problems[0].name}`)

        }
        for (let i = 0; i < $scope.problems.length; i++) {
            $scope.problems[i].solutions = yield userService.getSolutions($scope.problems[i].name)
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
            //TODOl
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
        editor.setModel(monaco.editor.createModel(
            language.codeSnippet,
            language.monacoName
        ))
    }

    (async function () {
        while (!window.monaco)
            await new Promise(resolve => setTimeout(resolve, 100))
        editorContainer = document.getElementById('container')
        editor = monaco.editor.create(editorContainer, {
            value: $scope.languages[0].codeSnippet,
            language: $scope.languages[0].monacoName,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false
        })
    })()

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
    this.getSolutions = async function (name) {
        const res = await $http.get(`/api/solutions/${encodeURIComponent(name)}`)
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
