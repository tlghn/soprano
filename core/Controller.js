/**
 * Created by tolgahan on 17.11.2016.
 */
"use strict";

const EventEmitter = require('./EventEmitter');
const Disposable = require('./Disposable');
const SopranoClient = require('./SopranoClient');
const errors = require('./errors');
const Symbols = require('./symbols');
const Protocol = require('./Protocol');
const EventBridge = require('./EventBridge');
const FLAG_READ = 1;
const FLAG_WRITE = 2;
const debug = require('./debug')();
const EE = require('events');

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


        sopranoClient.on('disposed', this.dispose.bind(this));
        sopranoClient.on('connect', this._handleConnect);
        sopranoClient.on('close', function () {
            this.emit('disconnect');

            if(this.client.server){
                this.dispose();
            }
        }.bind(this));
        this._handleConnect();
    }

    _handleConnect(){
        this.canRead && this.connected &&
        ((async function() {
            while (this.connected){
                let input = await this.client.createInput(this.protocol.createInput(this.client, this.header));
                try{
                    let data = await input.read();
                    debug('%s:Controller >>> Received data from %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);

                    if(this.client.server){
                        let middleWares = this.protocol.middleWares;
                        for(let mw of middleWares){
                            try{
                                data = await mw(data, this.client);
                            } catch (err) {
                                return await this._handle(err, data);
                            }
                        }
                    }

                    await this._handle(null, data);
                    debug('%s:Controller >>> Incoming data processed for %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);

                } catch (err){
                    if(EE.listenerCount(this, 'error')){
                        this.emit('error', err);
                    }
                    if(this.connected){
                        debug('%s:Controller >>> Error occurs while reading from %s:%s %s', this.protocol.constructor.name, this.remoteAddress, this.remotePort, err.message);
                        try{
                            await this._handle(err);
                        } catch (err) {

                        }
                    } else {
                        break;
                    }
                } finally {
                    await input.release();
                }
            }
        }).bind(this))();

        this.canWrite && this.connected &&
        ((async function () {
            while (this.connected){
                let event = await this.whichever('disposed', 'disconnect', 'deque');
                if(event.eventName !== 'deque'){
                    break;
                }
                try{
                    let data = event.eventArgs[0];

                    if(!this.client.server){
                        let middleWares = this.protocol.middleWares;
                        for(let mw of middleWares){
                            data = await mw(data);
                        }
                    }

                    let output = await this.client.createOutput(this.protocol.createOutput(this.client, this.header));
                    await output.end(data);
                    debug('%s:Controller >>> Sent data to %s:%s', this.protocol.constructor.name, this.remoteAddress, this.remotePort);
                    this.setResource(Symbols.ready, true);
                    this._deque();
                } catch (err) {
                    if(EE.listenerCount(this, 'error')){
                        this.emit('error', err);
                    }
                    if(this.connected){
                        debug('%s:Controller >>> Error occurs while writing to %s:%s %s', this.protocol.constructor.name, this.remoteAddress, this.remotePort, err.message);
                    } else {
                        break;
                    }
                }
            }
        }).bind(this))();
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

    get state(){
        return this.getResource(Symbols.state);
    }

    ensureState(){
        if(!this.hasResource(Symbols.state)){
            this.setResource(Symbols.state, {});
        }
        return this.state;
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
    async _handle(err, data){
        throw new errors.NotImplementedError();
    }

    /**
     * @param data
     * @protected
     */
    async _write(data){
        if(!this.canWrite){
            throw new errors.InvalidOperationError('This controller not configured for write operations');
        }
        let buffer = this.getResource(Symbols.buffer);
        buffer.push(data);
        this._deque();
    }

    async post(message){

    }
}

Disposable.attach(Controller);

module.exports = Controller;