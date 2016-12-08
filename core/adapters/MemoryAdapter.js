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

const SOPRANO_MEMORY_ADAPTER = 'SopranoMemoryAdapter';
const IdClass = require('../Id');
const ID = new IdClass();
const debug = require('../debug')();

class MemoryAdapter extends Adapter {

    constructor(id = void 0){
        super();
        this.setResource(Symbols.children, new DisposableMap(this));
        this.id = id;

        if(cluster.isMaster){
            this.setResource(Symbols.ids, new DisposableSet(this));
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
    async _sendReceive(sender, name, args = void 0){
        let msg = this._createMessage(name, args);
        sender.send(msg);
        let reply = await this.when[`${name}:${msg.key}`]();
        return reply.result;
    }

    /**
     * @param name
     * @param args
     * @private
     */
    async _sendReceiveFromMaster(name, args = void 0){
        MemoryAdapter.throwIfMaster();
        return await this._sendReceive(process, name, args);
    }

    /**
     * @param worker
     * @param name
     * @param args
     * @private
     */
    async _sendReceiveFromWorker(worker, name, args = void 0){
        MemoryAdapter.throwIfWorker();
        return await this._sendReceive(worker, name, args);
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

        switch (message.name){
            case 'call':
                return ((async function (worker, message) {
                    var name = message.args.name;
                    if(typeof this[name] !== 'function'){
                        throw new errors.InvalidOperationError('Unknown method %s', name);
                    }
                    var params = (message.args.params || []).slice();
                    params.unshift(this);
                    let f = this[name].bind.apply(this[name], params);
                    message.result = await f();
                    worker.send(message);
                }).bind(this, worker, message))();
        }

        if(cluster.isMaster){
            switch (message.name){
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
                    return ((async function (worker, message) {
                        let controller = this._children.get(message.args.id);
                        if(!controller){
                            message.result = false;
                        } else {
                            message.result = await controller.post(message.args.data);
                        }
                        message.name = 'postReply';
                        worker.send(message);
                    }).bind(this, worker, message))();
            }
            this._emitMessageResult(message);
        }

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

    async getCount(){
        if(cluster.isMaster){
            return this._ids.size;
        }
        return await this._sendReceiveFromMaster('call', {name:'getCount'});
    }

    async getIds(){
        if(cluster.isMaster){
            return [...this._ids];
        }

        return await this._sendReceiveFromMaster('call', {name: 'getIds'});

    }

    _upsert(id){
        this._ids.add(id);
    }

    /**
     * @param controller {Controller}
     * @returns {Controller}
     */
    async add(controller){

        let id = controller.id = MemoryAdapter.generateId(controller);

        if(cluster.isMaster){
            await this._upsert(id);
        } else {
            await this._sendReceiveFromMaster('call', {name: '_upsert', params:[id]});
        }

        controller.on('close', async function (id) {
            await this.remove(id);
        }.bind(this, id));

        this._children.set(id, controller, true);

        return controller;
    }

    _remove(ids){
        if(!Array.isArray(ids)){
            ids = [ids];
        }
        let result = [];
        for(let id of ids){
            result.push(this._ids.delete(id));
        }
        if(result.length === 1 && !Array.isArray(arguments[0])){
            result = result[0];
        }
        return result;
    }

    async remove(ids){
        if(!Array.isArray(ids)){
            ids = [ids];
        }

        let result = [];

        if(cluster.isMaster){
            result.push(this._remove(ids));
        } else {
            result.push(await this._sendReceiveFromMaster('call', {name: '_remove', params:[ids]}));
        }

        for(let id of ids){
            await this._children.delete(id);
        }

        if(result.length === 1 && !Array.isArray(arguments[0])){
            result = result[0];
        }

        return result;
    }

    /**
     * @param ids
     * @param state
     * @param direct
     * @private
     */
    async _setState(ids, state, direct = false){

        if(!ids.length) return [];

        if(cluster.isMaster && !direct){
            let workerMap = new Map();
            for(let id of ids){
                try{
                    let worker = MemoryAdapter.getWorkerFromId(id);
                    if(!workerMap.has(worker)){
                        workerMap.set(worker, new Set());
                    }
                    workerMap.get(worker).add(id);
                } catch (err){
                }
            }

            return await Promise.all(
                [...workerMap].map(entry => {
                    if(!entry[0]){
                        return this._setState([...entry[1]], state, true)
                    }
                    return this._sendReceiveFromWorker(entry[0], 'call', {name: '_setState', params: [[...entry[1]], state]});
                })
            );
        }

        const vm = require('vm');
        const script = new vm.Script(`(${state.script})`);

        function *task(adapter, global, children, script, arg, ids) {
            for(let id of ids){
                let current = children.get(id);
                if (!current) continue;
                let stateObj = current.ensureState();
                yield script.runInNewContext(stateObj)(arg, {
                    controller: current,
                    adapter,
                    global
                });
            }
        }

        return [...task(this, global, this._children, script, state.arg, ids)];
    }

    async setState(ids, state){

        if(typeof state.script !== 'string'){
            throw new errors.InvalidArgumentError('state does not have valid script property');
        }

        if(!Array.isArray(ids)){
            ids = [ids];
        }

        let result = [];

        let myIds = ids.filter(id => this._children.has(id));
        let ids = ids.filter(id => !this._children.has(id));

        if(myIds.length){
            result.push(this._setState(myIds, state, true));
        }

        if(ids.length){
            if(cluster.isMaster){
                result.push(this._setState(ids, state));
            } else {
                result.push(this._sendReceiveFromMaster('call', {name:'_setState', params:[ids, state]}));
            }
        }

        if(result.length){
            result = await Promise.all(result);
        }

        if(result.length === 1 && !Array.isArray(arguments[0])){
            result = result[0];
        }

        return result;
    }

    /**
     * @param state
     * @param direct
     * @returns {Array}
     * @private
     */
    async _findIds(state, direct = false){

        if(cluster.isMaster && !direct) {
            let workerMap = new Map();
            for (let id of this._ids) {
                try {
                    let worker = MemoryAdapter.getWorkerFromId(id);
                    if (!workerMap.has(worker)) {
                        workerMap.set(worker, new Set());
                    }
                    workerMap.get(worker).add(id);
                } catch (err) {
                }
            }

            return (await Promise.all(
                [...workerMap].map(entry => {
                    if (!entry[0]) {
                        return this._findIds([...entry[1]], state, true)
                    }
                    return this._sendReceiveFromWorker(entry[0], 'call', {
                        name: '_findIds',
                        params: [[...entry[1]], state]
                    });
                })
            )).reduce((prev, cur) => prev.concat(cur), []);
        }

        const vm = require('vm');
        const script = new vm.Script(`(${state.script})`);
        const result = [];
        for(let controller of this._children.values()){
            let host = {
                adapter: this,
                global,
                controller
            };
            let stateObj = controller.ensureState();
            if(script.runInNewContext(stateObj)(state.arg, host)) {
                result.push(controller.id);
            }
        }
        return result;
    }

    async findIds(state){

        if(typeof state.script !== 'string'){
            throw new errors.InvalidArgumentError('state does not have valid script property');
        }
        
        if(cluster.isMaster){
            return await this._findIds(state);
        }

        return await this._sendReceiveFromMaster('call', {name: '_findIds', params:[state]});
    }

    async _post(ids, data){
        if(!Array.isArray(ids)){
            ids = [ids];
        }

        for(let id of ids){
            let worker = MemoryAdapter.getWorkerFromId(id);
            if(!worker){
                let controller = this._children.get(id);
                if(controller){
                    await controller.post(data);
                }
            } else {
                await this._sendReceiveFromWorker.bind(this, worker, 'post', {id, data});
            }
        }
    }

    async post(ids, data){
        if(cluster.isMaster){
            return await this._post(ids, data);
        }
        await this._sendReceiveFromMaster('call', {name:'_post', params:[ids, data]});
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