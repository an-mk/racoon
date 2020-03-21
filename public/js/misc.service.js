angular.module('app').service('miscService', function ($http) {
    this.getLanguages = async function () {
        if (!this.getLanguagesCache)
            this.getLanguagesCache = (await $http.get('/api/languages')).data
        return this.getLanguagesCache
    }
    this.getRanking = async function () {
        const res = await $http.get('/api/ranking')
        return res.data
    }
})