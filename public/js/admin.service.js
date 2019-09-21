angular.module('app').service('adminService', function ($http) {
    this.getSolutions = async function () {
        const res = await $http.get('/api/solutions/all')
        return res.data
    }
})