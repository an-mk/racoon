// Code from https://github.com/Magnetme/ng-async

angular.module('app').factory('$async', ['$q', ($q) => {
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