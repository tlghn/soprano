/**
 * Created by tolgahan on 17.11.2016.
 */
"use strict";

const EventEmitter = require('awync-events');
const Disposable = require('./Disposable');
const SopranoClient = require('./SopranoClient');
const errors = require('./errors');
const Symbols = require('./symbols');
const Protocol = require('./Protocol');
const EventBridge = require('./EventBridge');
const FLAG_READ = 1;
const FLAG_WRITE = 2;
const awync = require('awync');
const debug = require('./debug')();

class Controller extends EventEmitter {
    /**
     * @param sopranoClient {SopranoClient}
     * @param read {boolean}
     * @param write {boolean}
     */
    constructor(sopranoClient, read = true, write = true){
        super();
        if(this.constructor === Controller){
            throw new errors.AbstractError(Controller.name + ' class is abstract');
        }
        this.setResource(Symbols.target, sopranoClient, true);
        this.setResource(Symbols.buffer, []);
        this.setResource(Symbols.ready, true);
        this.setResource(Symbols.flags, (read && FLAG_READ) | (write && FLAG_WRITE));
        this._handleConnect = this._handleConnect.bind(this);

        this.setResource(Symbols.netEvents, EventBridge.create(sopranoClient, this, sopranoClient.eventNames));


        sopranoClient.on('dispose', this.dispose.bind(this));
        sopranoClient.on('connect', this._handleConnect);
        this._handleConnect();
    }

    _handleConnect(){
        this.canRead && this.connected &&
        awync(function *() {
            while (this.connected){
                let input = yield this.client.createInput(this.protocol.createInput(this.client, this.header));
                try{
                    let data = yield input.read();
                    debug('%s:Controller >>> Received data from %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);

                    if(this.client.server){
                        let middleWares = this.protocol.middleWares;
                        for(let mw of middleWares){
                            try{
                                data = yield mw(data, this.client);
                            } catch (err) {
                                yield this._handle(err, data);
                                return;
                            }
                        }
                    }

                    yield this._handle(null, data);
                    debug('%s:Controller >>> Incoming data processed for %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);

                } catch (err){
                    if(this.connected){
                        debug('%s:Controller >>> Error occurs while reading from %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);
                    } else {
                        break;
                    }
                } finally {
                    yield input.release();
                }
            }
        }.bind(this));

        this.canWrite && this.connected &&
        awync(function *() {
            while (this.connected){
                let event = yield this.whichever('disposed', 'deque');
                if(event.name === 'disposed'){
                    break;
                }
                try{
                    let data = event.args[0];

                    if(!this.client.server){
                        let middleWares = this.protocol.middleWares;
                        for(let mw of middleWares){
                            data = yield mw(data);
                        }
                    }

                    let output = yield this.client.createOutput(this.protocol.createOutput(this.client, this.header));
                    yield output.end(data);
                    debug('%s:Controller >>> Sent data to %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);
                    this.setResource(Symbols.ready, true);
                    this._deque();
                } catch (err) {
                    if(this.connected){
                        debug('%s:Controller >>> Error occurs while writing to %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);
                    } else {
                        break;
                    }
                }
            }
        }.bind(this));
    }

    get header(){
        return this.getResource(Symbols.header);
    }

    set header(value){
        this.setResource(Symbols.header, value);
    }

    /**
     * @returns {SopranoClient}
     */
    get client(){
        return this.getResource(Symbols.target);
    }

    /**
     * @returns {Protocol}
     */
    get protocol(){
        return this.client.protocol;
    }


    get id(){
        return this.getResource(Symbols.id);
    }

    set id(value){
        this.setResource(Symbols.id, value);
    }

    /**
     * @returns {*}
     */
    get remoteAddress(){
        return this.client.remoteAddress;
    }

    /**
     * @returns {*}
     */
    get remotePort(){
        return this.client.remotePort;
    }

    /**
     * @returns {boolean}
     */
    get connected(){
        return this.client.connected;
    }

    /**
     * @returns {boolean}
     */
    get canRead(){
        return !!(this.getResource(Symbols.flags) & FLAG_READ);
    }

    /**
     * @returns {boolean}
     */
    get canWrite(){
        return !!(this.getResource(Symbols.flags) & FLAG_WRITE);
    }

    /**
     * @private
     */
    _deque(){
        if(!this.getResource(Symbols.ready)){
            return;
        }
        let buffer = this.getResource(Symbols.buffer);
        if(!buffer.length) return;
        this.setResource(Symbols.ready, false);
        process.nextTick(function (current) {
            this.emit('deque', current);
        }.bind(this, buffer.shift()));
    }

    //noinspection JSMethodCanBeStatic
    /**
     * @param err {Error}
     * @param data
     * @protected
     */
    *_handle(err, data){
        throw new errors.NotImplementedError();
    }

    /**
     * @param data
     * @protected
     */
    *_write(data){
        if(!this.canWrite){
            throw new errors.InvalidOperationError('This controller not configured for write operations');
        }
        let buffer = this.getResource(Symbols.buffer);
        buffer.push(data);
        this._deque();
    }

    *post(message){

    }
}

Disposable.attach(Controller);

module.exports = Controller;