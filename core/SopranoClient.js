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


class SopranoClient extends Slave {

    constructor(protocol, options){
        if(!(protocol instanceof Protocol)){
            throw new errors.InvalidArgumentError('protocol must be Protocol instance');
        }
        super(protocol.soprano);
        this.setResource(Symbols.protocol, protocol, true);
        this.setResource(Symbols.options, options);
    }

    /**
     * @param net Client
     * @returns SopranoClient
     * @private
     */
    _init(net){
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

        net.pause();

        return this;
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
        return this.getResource(Symbols.options);
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


    *connect(options = void 0, callback = void 0){

        if(this.net){
            throw new errors.InvalidOperationError('Already initialized. Call close() first');
        }

        let {host, port} = this;
        options = Object.assign({}, {host, port}, this.getResource(Symbols.options), options);
        this.setResource(Symbols.host, options.host);
        this.setResource(Symbols.port, options.port);

        this._init(this.soprano.socketFactory.createClient(options));

        this.net.connect(options, callback);

        yield this.whichever('error', 'connect');

        yield this;
    }

    *createInput(){
        let {protocol, soprano, net} = this;
        let inputs = Array.prototype.slice.call(arguments);
        
        let filters = yield protocol.createInputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        inputs.unshift.apply(inputs, filters);
        
        if(protocol.isSopranoFiltersEnabled()){
            let filters = yield soprano.filterFactory.createInputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            inputs.unshift.apply(inputs, filters);
        }

        inputs.unshift(net);

        yield SopranoClient.pipeStreams.apply(null, inputs);
    }

    *createOutput(){
        let {protocol, soprano, net} = this;
        let outputs = Array.prototype.slice.call(arguments);


        let filters = yield protocol.createOutputFilter();
        if(!Array.isArray(filters)){
            filters = [filters];
        }
        outputs.push.apply(outputs, filters);


        if(protocol.isSopranoFiltersEnabled()){
            let filters = yield soprano.filterFactory.createOutputFilter();
            if(!Array.isArray(filters)){
                filters = [filters];
            }
            outputs.push.apply(outputs, filters);
        }

        outputs.push(
            new EndlessStream(),
            net
        );
        SopranoClient.pipeStreams.apply(null, outputs);
        yield awync()(outputs.find(item => item instanceof stream.Stream), null, true);
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

    /**
     * @param protocol Protocol
     * @param net Client
     * @returns SopranoClient
     */
    static create(protocol, net){
        return new SopranoClient(protocol)._init(net);
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

        source.on('error', dest.emit.bind(dest, 'error'))
            .on('disposed', dest.dispose.bind(dest));

        source.pipe(dest);
        return dest;
    }
}

module.exports = SopranoClient;