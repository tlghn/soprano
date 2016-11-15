/**
 * Created by tolgahan on 03.11.2016.
 */
"use strict";

const EE = require('events');
const EventEmitter = require('awync-events');
const awync = require('awync');
const Protocol = require('./Protocol');
const ProtocolCollection = require('./ProtocolCollection');
const SocketFactory = require('./SocketFactory');
const FilterFactory = require('./FilterFactory');
const Disposable = require('./Disposable');
const DisposableSet = require('./DisposableSet');
const EventBridge = require('./EventBridge');
const errors = require('./errors');
const Symbols = require('./symbols');
const SopranoServer = require('./SopranoServer');
const SopranoClient = require('./SopranoClient');

class Soprano extends EventEmitter {

    constructor(port, host){
        super();
        this.setResource(Symbols.protocols, new ProtocolCollection.Unique(this));
        
        if(typeof port === 'number'){
            this.port = port;
        } else if(typeof port === 'string'){
            if(!isNaN(port)){
                this.port = Number(port);
            }
        } else {
            this.port = void 0;
        }

        if(typeof host === 'string'){
            this.host = host;
        } else {
            this.host = void 0;
        }

        this.socketFactory = SocketFactory.defaultFactory;
        this.filterFactory = FilterFactory.defaultFactory;
    }

    /**
     * @returns ProtocolCollection
     */
    get protocols(){
        return this.getResource(Symbols.protocols);
    }

    /**
     * @returns SocketFactory
     */
    get socketFactory(){
        return this.getResource(Symbols.socketFactory);
    }

    set socketFactory(/*SocketFactory*/factory){
        if(!(factory instanceof SocketFactory)){
            throw new errors.InvalidArgumentError('factory should be instance of SocketFactory');
        }
        this.setResource(Symbols.socketFactory, factory, true);
    }

    /**
     * @returns FilterFactory
     */
    get filterFactory() {
        return this.getResource(Symbols.filterFactory);
    }

    set filterFactory(/*FilterFactory*/factory){
        if(!(factory instanceof FilterFactory)){
            throw new errors.InvalidArgumentError('factory should be instance of FilterFactory');
        }
        this.setResource(Symbols.filterFactory, factory, true);
    }

    /**
     *
     * @returns Number
     */
    get port(){
        return (this.parent && this.parent.port) || this.getResource(Symbols.port);
    }

    /***
     * @returns {String}
     */
    get host(){
        return (this.parent && this.parent.host) || this.getResource(Symbols.host);
    }

    set port(/*Number*/port){
        if(typeof port === 'undefined'){
            port = Soprano.DEFAULT_PORT;
        }

        if(typeof port !== 'number'){
            throw new TypeError('Invalid port');
        }

        this.setResource(Symbols.port, port);
    }

    set host(/*String*/host){
        if(typeof host === 'undefined' || host === ''){
            host = Soprano.DEFAULT_HOST;
        }

        if(typeof host !== 'string'){
            throw new TypeError('Invalid host');
        }

        this.setResource(Symbols.host, host);
    }

    *listen(options = void 0){
        let server = new SopranoServer(this, options);
        yield server.listen();
    }

    *bind(protocol, options){
        yield this.protocols.bind(protocol, options);
    }

    createProtocol(protocolClass, options = void 0){
        if(Protocol.isPrototypeOf(protocolClass)){
            return new protocolClass(this, options);
        }
    }

    /**
     * @param protocol Protocol
     * @param options SocketFactory options
     * @returns Soprano
     */
    static *connect(protocol, options = void 0){
        let client = new SopranoClient(protocol, options);
        yield client.connect();
    }


    _onDispose(){

    }
}

Disposable.attach(Soprano);

Soprano.DEFAULT_PORT = 30001;
Soprano.DEFAULT_HOST = '127.0.0.1';



module.exports = Soprano;