
class FunctionQueue {
    constructor(fun, maxParallel = 1) {
        this._fun = fun
        this._queue = []
        this._running = 0
        this._maxParallel = maxParallel
    }
    async push(...args) {
        this._queue.push(args)
        this._run()
    }

    async _run() {
        if (this._running < this._maxParallel) {
            this._running++
            while (this._running <= this._maxParallel && this._queue.length)
                try {
                    await this._fun(...(this._queue.shift()))
                } catch (err) {
                    console.log(err)
                }
            this._running--
        }
    }
}

Object.defineProperty(FunctionQueue.prototype, 'maxParallel', {
    set: function(val) {
        const added = val - this._maxParallel
        this._maxParallel = val
        while (added-- > 0)
            this._run()
    },
    get: function() {
        this._maxParallel
    }
})
Object.defineProperty(FunctionQueue.prototype, 'length', {
    get: () => this._queue.length
})

module.exports = FunctionQueue
