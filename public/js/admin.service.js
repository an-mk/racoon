angular.module('app').service('adminService', function ($http) {
    this.getSolutions = async function () {
        const res = await $http.get('/api/solutions/all')
        return res.data
    }

    this.getCheckEnvs = async function () {
        const res = await $http.get('/api/checkenvs')
        return res.data
    }

    this.addProblem = async function (name, content, checkEnv, checkerCode) {
        try {
            const res = await $http.post('/api/problems/add', {
                name: name,
                content: content,
                checkEnv: checkEnv,
                checkerCode: checkerCode
            })
            return res.status
        } catch (err) {
            console.error(err)
            return err.status
        }
    }

    this.addTest = async function (name, file) {
        const formData = new FormData();
        formData.append('test', file);
        const res = await $http.post(`/api/problems/addtest/${name}`, formData, {
            withCredentials: true,
            headers: { 'Content-Type': undefined },
            transformRequest: angular.identity
        })
        return res.data
    }
})