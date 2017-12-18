export default new class {    
    constructor() {
        // 用map来保存某个事件对应的回调函数
        this.listeners = new Map();
    }

    /**
     * 注册监听函数
     * 
     * @param {any} label 事件
     * @param {any} callback 回调函数 
     * @param {any} vm vue实例
     * @returns 
     */
    addListener(label, callback, vm) {
        // 回调函数类型是回调函数才对
        if(typeof callback == 'function'){
            // 这里就很常见的写法了，判断map中是否已经注册过该事件了
            // 如果没有，就初始化该事件映射的值为空数组，方便以后直接存入回调函数
            // 反之，直接将回调函数放入数组即可
            this.listeners.has(label) || this.listeners.set(label, []);
            this.listeners.get(label).push({callback: callback, vm: vm});

            return true
        }

        return false
    }

    /**
     * 移除监听函数
     * 
     * @param {any} label 事件
     * @param {any} callback 回调函数
     * @param {any} vm vue实例
     * @returns 
     */
    removeListener(label, callback, vm) {
        let listeners = this.listeners.get(label),
            index;


        // 这里的写法可能让初学者有点看不懂
        // 不过其实就是一个循环，去从对象中找到该信号对应的回调函数队列，然后从队列中找到该回调函数，然后删除了
        // 这里别的写法也有很多，大家可以自己写写。
        if (listeners && listeners.length) {
            index = listeners.reduce((i, listener, index) => {
                return (typeof listener.callback == 'function' && listener.callback === callback && listener.vm == vm) ?
                    i = index :
                    i;
            }, -1);

            if (index > -1) {
                listeners.splice(index, 1);
                this.listeners.set(label, listeners);
                return true;
            }
        }
        return false;
    }

    /**
     * 这里就是当oberver收到信号时，执行该信号对应的所有回调函数
     * 
     * @param {any} label 
     * @param {any} args 
     * @returns 
     */
    emit(label, ...args) {
        let listeners = this.listeners.get(label);

        if (listeners && listeners.length) {
            listeners.forEach((listener) => {
                listener.callback.call(listener.vm,...args)
            });
            return true;
        }
        return false;
    }

}