angular.module('app').controller('accountController', function ($scope, userService, notificationService) {
    window.mdc.autoInit()

    userService.amIAdmin().then(res => {
        $scope.admin = res
        $scope.$apply()
    })
    
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
        document.querySelector('div[chart="effectiveness"]').style.height = '320px';
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
