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
const EventEmitter = require('awync-events');
const awync = require('awync');
const EndlessStream = require('./EndlessStream');
const EE = require('events');
const debug = require('./debug');

class Reader extends stream.PassThrough {
    constructor(client){
        super();
        this._handleData = this._handleData.bind(this);
        this._handleError = this._handleError.bind(this);
        this._handleDisposed = this._handleDisposed.bind(this);
        this.setResource(Symbols.target, client, true);
        client.on('error', this._handleError)
            .on('disposed', this._handleDisposed)
            .on('data', this._handleData)
            .on('close', this._handleDisposed);

    }

    get _target(){
        return this.getResource(Symbols.target);
    }

    _handleError(err){
        this.emit('error', err);
    }

    _handleDisposed() {
        this.dispose();
    }

    _handleData(data) {
        this._target.pause();
        this.write(data, function () {
            this._target.resume();
        }.bind(this))
    }

    dispose(){
        console.log('dispose');
        super.dispose();
    }

    _onDispose(){
        this._target.removeListener('error', this._handleError)
            .removeListener('disposed', this._handleDisposed)
            .removeListener('data', this._handleData)
            .removeListener('close', this._handleDisposed);
    }
}

class Writer extends stream.PassThrough {
    constructor(client){
        super();
        this._handleError = this._handleError.bind(this);
        this._handleDisposed = this._handleDisposed.bind(this);
        this.setResource(Symbols.target, client, true);
        client.on('error', this._handleError)
            .on('disposed', this._handleDisposed)
            .on('close', this._handleDisposed);
    }

    get _target(){
        return this.getResource(Symbols.target);
    }

    _handleError(err){
        this.emit('error', err);
    }

    _handleDisposed() {
        this.dispose();
    }

    _onDispose(){
        this._target.removeListener('error', this._handleError)
            .removeListener('disposed', this._handleDisposed)
            .removeListener('close', this._handleDisposed);
    }

    write(data, encoding, cb){
        return this._target.write(data, encoding, cb);
    }
}

Disposable.attach(Reader);
Disposable.attach(Writer);

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

        let reader = new Reader(net);

        inputs.unshift(reader);

        inputs = inputs.filter(x=>x instanceof Stream);

        let result = yield SopranoClient.pipeStreams.apply(null, inputs);
        result.release = function *() {
            reader.dispose();
            yield true;
        }.bind(result);

        yield result;
        this.net.resume();
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

        outputs.push(
            new Writer(net)
        );

        outputs = outputs.filter(x => x instanceof Stream);

        let first = outputs[0];
        first.release = function *() {
            first.dispose();
            yield true;
        }.bind(first);

        SopranoClient.pipeStreams.apply(null, outputs);
        yield awync()(first, null, true);
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

    static pipeStreams(source, dest){
        
        if(arguments.length > 2){
            let prev = SopranoClient.pipeStreams(arguments[0], arguments[1]);
            for(var i=2; i<arguments.length; i++){
                prev = SopranoClient.pipeStreams(prev, arguments[i]);
            }
            return prev;
        }

        if(source){
            Disposable.attach(source);
            EventEmitter.attach(source);
        }

        if(dest){
            Disposable.attach(dest);
            EventEmitter.attach(dest);
        }

        if(!source || !dest){
            return source || dest;
        }


        var listeners = {
            error: dest.emit.bind(dest, 'error'),
            disposed: dest.dispose.bind(dest)
        };

        Object.keys(listeners).forEach(key => source.on(key, listeners[key]));

        source.pipe(dest);
        return dest;
    }
}

module.exports = SopranoClient;