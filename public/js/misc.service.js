angular.module('app').service('miscService', function ($http) {
    this.getLanguages = async function () {
        const res = await $http.get('/api/languages')
        return res.data
    }
    this.getRanking = async function () {
        const res = await $http.get('/api/ranking')
        return res.data
    }
})