import Observer from './Observer'
import Emitter from './Emitter'

export default {
    /**
     * 这个install函数就是用来注册vue插件的一个标配了
     * 编写这个函数后，再Vue.use(...),就可以将该插件挂载在全局
     * 详情：https://cn.vuejs.org/v2/guide/plugins.html
     * 
     * @param {any} Vue
     * @param {any} connection 与服务端socket连接的url
     * @param {any} store vuex的store
     */
    install(Vue, connection, store){

        // 如果不传进连接的url，就会抛出一个错误，因为用ws，肯定需要与服务端的socket连接，
        // 不然没意义
        if(!connection) throw new Error("[Vue-Socket.io] cannot locate connection")

        // 这里创建一个observe对象，具体做了什么可以看Observer.js文件
        let observer = new Observer(connection, store)

        // 将socket挂载到了vue的原型上,然后就可以
        // 在vue实例中就可以this.$socket.emit('xxx', {})
        Vue.prototype.$socket = observer.Socket;

        // 👇就是在vue实例的生命周期做一些操作
        Vue.mixin({
            /**
             * 在created的时候，将vue实例中的sockets对象缓存在另一个变量sockets中
             * 然后用proxy创建一个新的对象，另this.$option.sockets指向该对象，
             * proxy会对该这个新对象的set和deleteProperty操作做拦截
             * set的时候，key就是socket事件，value就是监听到这个信号后的回调，用作者封装好的Emitter注册监听事件
             * deleteProperty的时候就自然是移除监听事件了
             * 最后再将原来的sockets对象里的键值，重新赋给这个proxy后的对象，那么
             * 就可以做到该库文档中的用法
             * 
             * On Vuejs instance usage
             * var vm = new Vue({
                sockets:{
                    connect: function(){
                        console.log('socket connected')
                    },
                    customEmit: function(val){
                        console.log('this method was fired by the socket server. eg: io.emit("customEmit", data)')
                    }
                },
                methods: {
                    clickButton: function(val){
                        // $socket is socket.io-client instance
                        this.$socket.emit('emit_method', val);
                    }
                }
                })

                和
                
                Dynamic socket event listeners
                this.$options.sockets.event_name = (data) => {
                    console.log(data)
                }

                delete this.$options.sockets.event_name;
             */
            created(){
                let sockets = this.$options['sockets']

                this.$options.sockets = new Proxy({}, {
                    set: (target, key, value) => {
                        Emitter.addListener(key, value, this)
                        target[key] = value
                        return true;
                    },
                    deleteProperty: (target, key) => {
                        Emitter.removeListener(key, this.$options.sockets[key], this)
                        delete target.key;
                        return true
                    }
                })

                if(sockets){
                    Object.keys(sockets).forEach((key) => {
                        this.$options.sockets[key] = sockets[key];
                    });
                }
            },
            /**
             * 在beforeDestroy的时候，将在created时监听好的socket事件，全部取消监听
             * delete this.$option.sockets的某个属性时，就会将取消该信号的监听
             */
            beforeDestroy(){
                let sockets = this.$options['sockets']

                if(sockets){
                    Object.keys(sockets).forEach((key) => {
                        delete this.$options.sockets[key]
                    });
                }
            }
        })

    }

}


