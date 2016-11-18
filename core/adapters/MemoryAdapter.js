/**
 * Created by tolgahan on 16.11.2016.
 */
"use strict";
const Adapter = require('../Adapter');
const Symbols = require('../symbols');
const DisposableMap = require('../DisposableMap');
const DisposableSet = require('../DisposableSet');
const errors = require('../errors');
const Controller = require('../Controller');
const cluster = require('cluster');
const Worker = cluster.Worker;
const awync = require('awync');

const SOPRANO_MEMORY_ADAPTER = 'SopranoMemoryAdapter';
const IdClass = require('../Id');
const ID = new IdClass();

class MemoryAdapter extends Adapter {

    constructor(id = void 0){
        super();
        this.setResource(Symbols.children, new DisposableMap(this));
        this.id = id;

        if(cluster.isMaster){
            this.setResource(Symbols.ids, new DisposableMap(this));
        }

        if(cluster.isMaster){
            this._handleMessage = this._handleMessage.bind(this);
            cluster.on('message', this._handleMessage);
        } else {
            this._handleMessage = this._handleMessage.bind(this, process);
            cluster.worker.on('message', this._handleMessage);
        }
    }

    /**
     * @param message
     * @private
     */
    _emitMessageResult(message){
        this.emit(`${message.name}:${message.key}`, message);
    }

    _createMessage(name, args){
        let key = ID.next();
        let id = this.id;
        return {name, args, target:SOPRANO_MEMORY_ADAPTER, id, key};
    }

    /**
     * @param sender
     * @param name
     * @param args
     * @private
     */
    *_sendReceive(sender, name, args = void 0){
        let msg = this._createMessage(name, args);
        sender.send(msg);
        let reply = yield this.when[`${name}:${msg.key}`]();
        yield reply.result;
    }

    /**
     * @param name
     * @param args
     * @private
     */
    *_sendReceiveFromMaster(name, args = void 0){
        MemoryAdapter.throwIfMaster();
        yield this._sendReceive(process, name, args);
    }

    /**
     * @param worker
     * @param name
     * @param args
     * @private
     */
    *_sendReceiveFromWorker(worker, name, args = void 0){
        MemoryAdapter.throwIfWorker();
        yield this._sendReceive(worker, name, args);
    }

    /**
     * @param worker {Worker}
     * @param message {*}
     * @private
     */
    _handleMessage(worker, message){
        if(!message || message.target !== SOPRANO_MEMORY_ADAPTER || message.id !== this.id){
            return;
        }

        if(cluster.isMaster){
            switch (message.name){
                case 'call':
                    return awync(function *(worker, message) {
                        var name = message.args.name;
                        if(typeof this[name] !== 'function'){
                            throw new errors.InvalidOperationError('Unknown method %s', name);
                        }
                        var params = (message.args.params || []).slice();
                        params.unshift(this);
                        let f = this[name].bind.apply(this[name], params);
                        message.result = yield f();
                        worker.send(message);
                    }.bind(this, worker, message));
                case 'postReply':
                    message.name = 'post';
                    return this._emitMessageResult(message);
                case 'updateAdapterId':
                    return;
                default:
                    throw new errors.InvalidOperationError('Unknown message %s', message.name);
            }
        } else {
            switch (message.name){
                case 'post':
                    return awync(function *(worker, message) {
                        let controller = this._children.get(message.args.id);
                        if(!controller){
                            message.result = false;
                        } else {
                            message.result = yield controller.post(message.args.data);
                        }
                        message.name = 'postReply';
                        worker.send(message);
                    }.bind(this, worker, message));
            }
            this._emitMessageResult(message);
        }

    }

    /**
     * @param ids
     * @param state
     * @private
     */
    *_setState(ids, state){
        if(typeof state.script !== 'string'){
            throw new errors.InvalidArgumentError('state does not have valid script property');
        }
        if(!Array.isArray(ids)){
            ids = [ids];
        }
        const vm = require('vm');
        const script = new vm.Script(`(${state.script})`);
        for(let id of ids){
            let current = this._ids.get(id);
            if(!current) continue;
            let result = script.runInNewContext(current)(state.arg);
            yield result;
        }
    }

    *_findIds(state){
        if(typeof state.script !== 'string'){
            throw new errors.InvalidArgumentError('state does not have valid script property');
        }
        const vm = require('vm');
        const script = new vm.Script(`(${state.script})`);
        const result = [];
        for(let entry of this._ids){
            if(script.runInNewContext(entry[1])(state.arg)) {
                result.push(entry[0]);
            }
        }
        yield result;
    }

    /**
     * @returns {Array.<Controller>|DisposableMap|Map}
     * @private
     */
    get _children(){
        return this.getResource(Symbols.children);
    }

    /**
     * @returns {DisposableMap|Map}
     * @private
     */
    get _ids(){
        MemoryAdapter.throwIfWorker();
        return this.getResource(Symbols.ids);
    }

    get id(){
        return this.getResource(Symbols.id);
    }

    set id(value){
        let prev = this.id;
        this.setResource(Symbols.id, value);
        if(cluster.isWorker){
            process.send(this._createMessage('updateAdapterId', {prev}));
        }
    }

    *getCount(){
        if(cluster.isMaster){
            yield this._ids.size;
        } else {
            yield this._sendReceiveFromMaster('call', {name:'getCount'});
        }
    }

    *getIds(){
        if(cluster.isMaster){
            yield [...this._ids.keys()];
        } else {
            yield this._sendReceiveFromMaster('call', {name: 'getIds'});
        }
    }

    *_upsert(id){
        if(!this._ids.has(id)){
            this._ids.set(id, {});
        }
    }

    /**
     * @param controller {Controller}
     * @returns {Controller}
     */
    *add(controller){

        let id = controller.id = MemoryAdapter.generateId(controller);

        if(cluster.isMaster){
            yield this._upsert(id);
        } else {
            yield this._sendReceiveFromMaster('call', {name: '_upsert', params:[id]});
        }

        controller.on('close', function (id) {
            awync(this.remove.bind(this, id));
        }.bind(this, id));

        this._children.set(id, controller, true);

        yield controller;
    }

    *_remove(id){
        yield this._ids.delete(id);
    }

    *remove(id){
        if(cluster.isMaster){
            yield this._remove(id);
        } else {
            yield this._sendReceiveFromMaster('call', {name: '_remove', params:[id]});
        }
        yield this._children.delete(id);
    }

    *setState(ids, state){
        if(cluster.isMaster){
            yield this._setState(ids, state);
        } else {
            yield this._sendReceiveFromMaster('call', {name:'setState', params:[ids, state]});
        }
    }

    *findIds(state){
        if(cluster.isMaster){
            yield this._findIds(state);
        } else {
            yield this._sendReceiveFromMaster('call', {name: 'findIds', params:[state]});
        }
    }

    *_post(ids, data){
        if(!Array.isArray(ids)){
            ids = [ids];
        }
        const ops = [];

        for(let id of ids){
            let worker = MemoryAdapter.getWorkerFromId(id);
            if(!worker){
                let controller = this._children.get(id);
                if(controller){
                    ops.push(controller.post.bind(controller, data));
                }
            } else {
                ops.push(this._sendReceiveFromWorker.bind(this, worker, 'post', {id, data}))
            }
        }

        yield awync(ops);
    }

    *post(ids, data){
        if(cluster.isMaster){
            yield this._post(ids, data);
        } else {
            yield this._sendReceiveFromMaster('call', {name:'_post', params:[ids, data]});
        }
    }

    _onDispose(){
        if(cluster.isMaster){
            cluster.removeListener('message', this._handleMessage);
        } else {
            cluster.worker.removeListener('message', this._handleMessage);
        }
    }

    static generateId(controller){
        return `W<${cluster.isMaster ? '' : cluster.worker.id}>+${controller.remoteAddress}:${controller.remotePort}`;
    }
    static getWorkerFromId(id){
        MemoryAdapter.throwIfWorker();
        var m = (/^W\<(.*?)\>/).exec(id);
        if(!m){
            throw new errors.InvalidArgumentError('Invalid id');
        }
        if(!m[1] || m[1] === ''){
            return null;
        }

        let worker = cluster.workers[m[1]];
        if(!worker){
            throw new errors.InvalidOperationError('Worker not found');
        }

        return worker;
    }

    static throwIfWorker(){
        if(cluster.isWorker){
            throw new errors.InvalidOperationError('cluster is worker');
        }
    }
    static throwIfMaster(){
        if(cluster.isMaster){
            throw new errors.InvalidOperationError('cluster is master');
        }
    }

    static configMaster(){
        MemoryAdapter.throwIfWorker();
        (function () {
            var adapters = {};
            cluster.on('message', function (worker, message) {
                if(!message || message.target !== SOPRANO_MEMORY_ADAPTER || message.name !== 'updateAdapterId' || adapters[message.id]){
                    return;
                }
                if(!adapters[message.args.prev]){
                    adapters[message.id] = new MemoryAdapter(message.id);
                } else {
                    var prev = adapters[message.args.prev];
                    delete adapters[message.args.prev];
                    prev.id = message.id;
                    adapters[message.id] = prev;
                }
            })
        })();
    }
}


module.exports = MemoryAdapter;