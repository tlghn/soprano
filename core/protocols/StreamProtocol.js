/**
 * Created by tolgahan on 17.11.2016.
 */
"use strict";

const Protocol = require('./../Protocol');
const SopranoClient = require('../SopranoClient');
const errors = require('./../errors');
const Symbols = require('../symbols');
const Adapter = require('../Adapter');
const MemoryAdapter = require('../adapters/MemoryAdapter');
const Controller = require('../Controller');
const debug = require('../debug')();

class StreamProtocol extends Protocol {

    constructor(soprano){
        super(soprano, StreamProtocol);
        this.adapter = new MemoryAdapter(this.constructor.name);
    }

    /**
     * @returns {Adapter}
     */
    get adapter(){
        return this.getResource(Symbols.adapter);
    }

    set adapter(/*Adapter*/value){
        if(!(value instanceof Adapter)){
            throw new errors.InvalidArgumentError('value must be Adapter');
        }
        this.setResource(Symbols.adapter, value, !!this.adapter);
    }

    /**
     * @param options {*}
     * @param header {*}
     * @returns {Controller}
     * @protected
     */
    async _execute(options = void 0, header = void 0){
        debug('%s >> initialize request', this.constructor.name);
        let connection = await this._connect(options);
        let controller = await this.createClientController(connection);
        controller.header = header;
        return controller;
    }

    /**
     * @param connection {SopranoClient}
     * @param header {Buffer}
     * @returns {Controller}
     */
    async handover(connection, header){
        debug('%s >> connection accepted from %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);
        let controller = await this.createServerController(connection);
        controller.header = header;
        this.emit('connection', connection, controller);
        return await this.adapter.add(controller);
    }

    /**
     * @param sopranoClient {SopranoClient}
     * @returns {Controller}
     */
    createClientController(sopranoClient){
        throw new errors.NotImplementedError();
    }

    /**
     * @param sopranoClient {SopranoClient}
     * @returns {Controller}
     */
    createServerController(sopranoClient){
        throw new errors.NotImplementedError();
    }
}

module.exports = StreamProtocol;