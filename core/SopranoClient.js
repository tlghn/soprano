/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Slave = require('./Slave');
const Symbols = require('./symbols');
const SocketFactory = require('./SocketFactory');
const Client = SocketFactory.Client;
const EventBridge = require('./EventBridge');
const Protocol = require('./Protocol');
const errors = require('./errors');
const stream = require('stream');
const Stream = stream.Stream;
const Disposable = require('./Disposable');
const debug = require('./debug')();
const Reader = require('./Reader');
const Writer = require('./Writer');
const utils = require('../utils');


class SopranoClient extends Slave {

    constructor(protocol, options){
        if(!(protocol instanceof Protocol)){
            throw new errors.InvalidArgumentError('protocol must be Protocol instance');
        }
        super(protocol.soprano);
        this.setResource(Symbols.protocol, protocol, true);
        this.setResource(Symbols.initialOptions, options);

    }
    
    async _handleBridgedEvent(source, name, args){
        let options = this.options;
        switch (name){
            case 'close':
                this.deleteResource(Symbols.connected);
                break;
            case 'connect':
                this.setResource(Symbols.connected, true);
                break;
        }
        return false;
    }

    /**
     * @param net Client
     * @param connected
     * @returns SopranoClient
     * @private
     */
    _init(net, connected = false){
        if(!(net instanceof Client)){
            throw new errors.InvalidArgumentError('net must be instance of Client');
        }
        net.setNoDelay(true);

        this.setResource(Symbols.net, net);
        this.setResource(
            Symbols.netEvents,
            EventBridge.create(
                net,
                this,
                net.eventNames
            )
        );

        this.emit('net', net);

        this.setResource(Symbols.connected, connected);

        if(connected){
            net.pause();
        }

        return this;
    }

    /**
     * @param net {Client}
     * @private
     */
    _destroy(net){
        if(!net){
            return;
        }

        this.deleteResource(Symbols.netEvents);
        this.deleteResource(Symbols.net);
        this.deleteResource(Symbols.connected);
        net.dispose();
    }

    /**
     * @returns {Protocol}
     */
    get protocol(){
        return this.getResource(Symbols.protocol);
    }

    /**
     * @returns {Object}
     */
    get initialOptions(){
        return this.getResource(Symbols.initialOptions);
    }

    /**
     * @returns {Client}
     */
    get net(){
        return this.getResource(Symbols.net);
    }

    /**
     * @returns {string}
     */
    get host(){
        return this.getResource(Symbols.host) || (this.initialOptions && this.initialOptions.host) || this.soprano.host;
    }

    /**
     * @returns {number}
     */
    get port(){
        return this.getResource(Symbols.port) || (this.initialOptions && this.initialOptions.port) || this.soprano.port;
    }

    /**
     * @returns {boolean}
     */
    get connected(){
        return !!this.getResource(Symbols.connected);
    }

    /**
     * @returns {SopranoServer}
     */
    get server(){
        return this.getResource(Symbols.server);
    }

    set server(/*SopranoServer*/value){
        let SopranoServer = require('./SopranoServer');
        if(!(value instanceof SopranoServer)){
            throw new errors.InvalidArgumentError('value must be SopranoServer');
        }
        this.setResource(Symbols.server, value, true);
    }

    get options(){
        return this.getResource(Symbols.options);
    }
    
    async _reconnectOnDisconnect(){
        try{
            let event = await this.whichever('error', 'close');
            if(event.args[0]){
                var err = new Error();
                err.code = 'ECONNRESET';
                //noinspection ExceptionCaughtLocallyJS
                throw err;
            } else {
                delete this._connectedBefore;
            }
        }catch (err){
            if(this.options.reconnectAlways){
                err.code = 'ECONNRESET';
            }
            switch (err.code){
                case 'ECONNRESET':
                case 'ETIMEDOUT':
                    if(this.options.reconnect){
                        await utils.sleep(this.options.reconnectDelay || 0);
                        this.deleteResource(Symbols.connected);
                        this.connect(this.options);
                    }
                    break;
            }
        }
    }

    async connect(options = void 0, callback = void 0){
        
        if(this.net && this.connected){
            throw new errors.InvalidOperationError('Already initialized. Call close() first');
        }

        let {host, port} = this;
        options = Object.assign({}, {host, port}, this.initialOptions, options);
        this.setResource(Symbols.options, options);
        this.setResource(Symbols.host, options.host);
        this.setResource(Symbols.port, options.port);

        do{
            this._destroy(this.net);
            this._init(this.soprano.socketFactory.createClient(options));
            debug('connecting to %s:%s', options.host, options.port);
            this.net.connect(options, callback);
            try{
                await this.whichever('error', 'connect');
                debug('connected');
                if(this._connectedBefore){
                    this.emit('reconnected');
                }
                this._connectedBefore = true;
                this._reconnectOnDisconnect();
                break;
            }catch (err){
                switch (err.code){
                    case 'ECONNREFUSED':
                    case 'ECONNRESET':
                    case 'ETIMEDOUT':
                        if(!options.reconnect){
                            throw err;
                        }
                        await utils.sleep(options.reconnectDelay || 0);
                        this.emit('reconnect');
                        debug('reconnecting');
                        break;
                    default:
                        throw err;
                }
            }
        } while (true);

        return this;
    }

    async createInput(){
        let {protocol, soprano, net} = this;
        let inputs = Array.prototype.slice.call(arguments)
            .reduce((prev, cur) => prev.concat(cur), []);
        
        let filters = await protocol.createInputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        inputs.unshift.apply(inputs, filters);
        
        if(protocol.canUseSopranoFilters()){
            let filters = await soprano.filterFactory.createInputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            inputs.unshift.apply(inputs, filters);
        }

        return new Reader(net, inputs.filter(x=>x instanceof Stream));
    }

    async createOutput(){
        let {protocol, soprano, net} = this;
        let outputs = Array.prototype.slice.call(arguments)
            .reduce((prev, cur) => prev.concat(cur), []);


        let filters = await protocol.createOutputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        outputs.push.apply(outputs, filters);


        if(protocol.canUseSopranoFilters()){
            let filters = await soprano.filterFactory.createOutputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            outputs.push.apply(outputs, filters);
        }

        outputs = outputs.filter(x => x instanceof Stream);

        return new Writer(outputs, net);
    }

    async end(){
        let {net} = this;
        if(!net){
            return;
        }
        await utils.callback(net.end.bind(net));
        net.destroy();
        this.dispose();
    }

    async write(data, enc){
        let {net} = this;
        if(!net) {
            throw new errors.InvalidOperationError('disconnected');
        }
        return await utils.callback(net.write.bind(net, data, enc));
    }

    get remoteAddress(){
        let {net} = this;
        return net && net.remoteAddress;
    }

    get remotePort(){
        let {net} = this;
        return net && net.remotePort;
    }

    get eventNames(){
        let eventNames = (this.net && this.net.eventNames) || [];
        return new Set([...eventNames].concat('reconnect', 'reconnected'));
    }

    /**
     * @param protocol Protocol
     * @param net Client
     * @param connected
     * @returns SopranoClient
     */
    static create(protocol, net, connected = false){
        return new SopranoClient(protocol)._init(net, connected);
    }
}

module.exports = SopranoClient;