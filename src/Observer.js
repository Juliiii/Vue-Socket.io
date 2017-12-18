import Emitter from './Emitter'
// 这里看出，其实就是一个封装，有兴趣的同学可以试试封装一个redux-socket.io
// 反正我写到这里时，我是真的想封装了,然而居然有人写了，233
import Socket from 'socket.io-client'

export default class{

    constructor(connection, store) {
        // 这里很明白吧，就是判断这个connection是什么类型
        // 这里的处理就是你可以传入一个连接好的socket实例，也可以是一个url
        if(typeof connection == 'string'){
            this.Socket = Socket(connection);
        }else{
            this.Socket = connection
        }

        // 如果有传进vuex的store可以响应在store中写的mutations和actions
        // 这里只是挂载在这个oberver实例上
        if(store) this.store = store;

        // 监听，启动！
        this.onEvent()

    }

    /**
     * 监听事件
     * 
     * 
     */
    onEvent(){
        // 监听服务端发来的事件，packet.data是一个数组
        // 第一项是事件，第二个是服务端传来的数据
        // 然后用emit通知订阅了该信号的回调函数执行
        // 如果有传入了vuex的store，将该事件和数据传入passToStore，执行passToStore的逻辑
        var super_onevent = this.Socket.onevent;
        this.Socket.onevent = (packet) => {
            super_onevent.call(this.Socket, packet);

            Emitter.emit(packet.data[0], packet.data[1]);

            if(this.store) this.passToStore('SOCKET_'+packet.data[0],  [ ...packet.data.slice(1)])
        };

        // 这里跟上面意思应该是一样的，我很好奇为什么要分开写，难道上面的写法不会监听到下面的信号？
        // 然后这里用一个变量暂存this
        // 但是下面都是箭头函数了，我觉得没必要，毕竟箭头函数会自动绑定父级上下文的this
        let _this = this;

        ["connect", "error", "disconnect", "reconnect", "reconnect_attempt", "reconnecting", "reconnect_error", "reconnect_failed", "connect_error", "connect_timeout", "connecting", "ping", "pong"]
            .forEach((value) => {
                _this.Socket.on(value, (data) => {
                    Emitter.emit(value, data);
                    if(_this.store) _this.passToStore('SOCKET_'+value, data)
                })
            })
    }

    /**
     * 将传入的事件和数据，做一些处理
     * 
     * @param {any} event 事件
     * @param {any} payload 数据
     */
    passToStore(event, payload){
        // 如果事件不是以SOCKET_开头的就不用管了
        if(!event.startsWith('SOCKET_')) return

        // 这里遍历vuex的store中的mutations
        for(let namespaced in this.store._mutations) {
            // 下面的操作是因为，如果store中有module是开了namespaced的，会在mutation的名字前加上 xxx/
            // 这里将mutation的名字拿出来
            let mutation = namespaced.split('/').pop()
            // 如果名字和事件是全等的，那就发起一个commit去执行这个mutation
            // 也因此，mutation的名字一定得是 SOCKET_开头的了
            if(mutation === event.toUpperCase()) this.store.commit(namespaced, payload)
        }
        // 这里类似上面
        for(let namespaced in this.store._actions) {
            let action = namespaced.split('/').pop()

            // 这里强制要求了action的名字要以 socket_ 开头
            if(!action.startsWith('socket_')) continue

            // 这里就是将事件转成驼峰式
            let camelcased = 'socket_'+event
                    .replace('SOCKET_', '')
                    .replace(/^([A-Z])|[\W\s_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase())

            // 如果action和事件全等，那就发起这个action
            if(action === camelcased) this.store.dispatch(namespaced, payload)
        }
    }
}
