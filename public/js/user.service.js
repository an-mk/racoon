angular.module('app').service('userService', function ($http) {
    const userService = this
    this.amIAdmin = async function () {
        const res = await $http.get('/api/me/amiadmin')
        return res.data
    }
    this.myName = async function () {
        const res = await $http.get('/api/me/myname')
        return res.data
    }
    this.login = async function (name, pswd) {
        const res = await $http.post('/api/session', { name: name, pswd: pswd })
        if (res.status == 200) return name
        throw new Error(res.data)
    }
    this.register = async function (name, pswd) {
        const res = await $http.post('/api/users/create', { name: name, pswd: pswd })
        if (res.status == 201) return await userService.login(name, pswd)
        throw new Error(res.data)
    }
    this.logout = async function () {
        await $http.delete('/api/session')
    }
    this.problemsList = async function () {
        if (!this.problemsListCache)
            this.problemsListCache = (await $http.get('/api/problems/list')).data
        return this.problemsListCache
    }
    this.problemsFirst = async function () {
        const res = await $http.get('/api/problems/first')
        return res.data
    }
    this.submit = async function (problem, code, lang) {
        const res = await $http.post('/api/solutions/submit', { problem: problem, code: code, lang: lang })
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