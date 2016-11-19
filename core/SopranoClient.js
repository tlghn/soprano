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
const awync = require('awync');
const debug = require('./debug')();

class Writer {

    constructor(outputs, net){
        outputs.forEach(function (stream) {
            stream.pause();
        });
        this._outputs = outputs;
        this._net = net;
    }

    *write(data, encoding){
        yield new Promise((resolve, reject) => {
            (this._outputs[0] || this._net).write(data, encoding, function (err) {
                if(err) return reject(err);
                return resolve();
            })
        });
    }

    *_transfer(from, to){
        yield new Promise((resolve, reject) => {

            function onReadable() {
                function readNext(err) {
                    if(err){
                        return reject(err);
                    }
                    var chunk = from.read();
                    if(chunk === null){
                        var rs = from._readableState;
                        if(rs && rs.objectMode){
                            return to.write(chunk, function (err) {

                                if(err) {
                                    return readNext(err);
                                }

                                if(rs.ended) {
                                    if(!rs.endEmitted){
                                        return from.end();
                                    }
                                    return;
                                }

                                readNext();
                            });
                        } else {
                            return from.end();
                        }
                    }
                    to.write(chunk, readNext);
                }

                readNext();
            }

            function onEnd(err) {
                from.removeListener('readable', onReadable);
                from.removeListener('end', onEnd);
                from.removeListener('error', onEnd);
                to.removeListener('error', onEnd);
                if(err instanceof Error) return reject(err);
                resolve(err);
            }

            if(typeof from.flush === 'function'){
                from.flush();
            }
            from.on('readable', onReadable);
            from.on('end', onEnd);
            from.on('error', onEnd);
            to.on('error', onEnd);
        });
    }

    *end(data, encoding){
        if(data){
            yield this.write(data, encoding);
        }
        var current = this._outputs.shift();
        while (current){
            var next = this._outputs.shift();
            yield this._transfer(current, next || this._net);
            current = next;
        }

        delete this._outputs;
        delete this._net;
    }

}

class Reader {
    constructor(net, inputs){
        net.pause();
        this._net = net;
        this._inputs = inputs;

        net.pause();
        inputs.forEach(input => input.pause());
    }

    *read(){
        yield new Promise((resolve, reject) => {

            var net = this._net;
            var inputs = this._inputs;

            inputs.forEach(input => {
                input.on('error', onResult);
            });

            net.on('error', onResult);
            net.on('readable', onReadable);
            
            function transform(value, copy) {
                if(!copy.length){
                    return onResult(value);
                }
                var current = copy.shift();
                current.write(value, function (err) {
                    if(err){
                        return onResult(err);
                    }
                    var value = current.read();
                    if(value === null){
                        var rs = current._readableState;
                        if(rs && rs.objectMode && rs.ended){
                            return transform(null, copy);
                        }
                        return onReadable();
                    }
                    transform(value, copy);
                });
            }

            function onReadable() {
                net.removeListener('readable', onReadable);
                var chunk = net.read();
                if(chunk === null) {
                    net.on('readable', onReadable);
                    return;
                }

                transform(chunk, inputs.slice());
            }

            function onResult(data){

                inputs.forEach(input => input.removeListener('error', onResult));
                net.removeListener('error', onResult);
                net.removeListener('readable', onReadable);

                if(data instanceof Error){
                    return reject(data);
                }

                resolve(data);
            }


        });
    }

    *release(){
        this._net.resume();
        delete this._net;
        delete this._inputs;
    }
}

class SopranoClient extends Slave {

    constructor(protocol, options){
        if(!(protocol instanceof Protocol)){
            throw new errors.InvalidArgumentError('protocol must be Protocol instance');
        }
        super(protocol.soprano);
        this.setResource(Symbols.protocol, protocol, true);
        this.setResource(Symbols.initialOptions, options);

    }
    
    _handleBridgedEvent(source, name, args){
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

    *connect(options = void 0, callback = void 0){

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
                yield awync.captureErrors;
                yield this.whichever('error', 'connect');
                debug('connected');
                if(this._connectedBefore){
                    this.emit('reconnected');
                }
                this._connectedBefore = true;

                awync(function *() {
                    yield awync.captureErrors;
                    try{
                        let event = yield this.whichever('error', 'close');
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
                                    yield awync.sleep(this.options.reconnectDelay || 0);
                                    this.deleteResource(Symbols.connected);
                                    awync(this.connect.bind(this, this.options));
                                }
                                break;
                        }
                    }
                }.bind(this));
                break;
            }catch (err){
                switch (err.code){
                    case 'ECONNREFUSED':
                    case 'ECONNRESET':
                    case 'ETIMEDOUT':
                        if(!options.reconnect){
                            throw err;
                        }
                        yield awync.sleep(options.reconnectDelay || 0);
                        this.emit('reconnect');
                        debug('reconnecting');
                        break;
                    default:
                        throw err;
                }
            }
        } while (true);

        yield this;
    }

    *createInput(){
        let {protocol, soprano, net} = this;
        let inputs = Array.prototype.slice.call(arguments)
            .reduce((prev, cur) => prev.concat(cur), []);
        
        let filters = yield protocol.createInputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        inputs.unshift.apply(inputs, filters);
        
        if(protocol.canUseSopranoFilters()){
            let filters = yield soprano.filterFactory.createInputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            inputs.unshift.apply(inputs, filters);
        }

        yield new Reader(net, inputs.filter(x=>x instanceof Stream));
    }

    *createOutput(){
        let {protocol, soprano, net} = this;
        let outputs = Array.prototype.slice.call(arguments)
            .reduce((prev, cur) => prev.concat(cur), []);


        let filters = yield protocol.createOutputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        outputs.push.apply(outputs, filters);


        if(protocol.canUseSopranoFilters()){
            let filters = yield soprano.filterFactory.createOutputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            outputs.push.apply(outputs, filters);
        }

        outputs = outputs.filter(x => x instanceof Stream);

        yield new Writer(outputs, net);
    }

    *end(){
        let {net} = this;
        if(!net){
            return;
        }
        net = awync()(net, null, false);
        yield net.end();
        net.destroy();
        this.dispose();
    }

    *write(data, enc){
        let {net} = this;
        if(!net) {
            throw new errors.InvalidOperationError('disconnected');
        }
        net = awync()(net, null, true);
        yield net.write(data, enc);
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