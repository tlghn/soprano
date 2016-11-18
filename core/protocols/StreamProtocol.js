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
     * @param options
     * @returns {Controller}
     * @protected
     */
    *_execute(options = void 0){
        let connection = yield this._connect(options);
        yield this.createClientController(connection);
    }

    /**
     * @param connection {SopranoClient}
     * @returns {Controller}
     */
    *handover(connection){
        let controller = yield this.createServerController(connection);
        yield this.adapter.add(controller);
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