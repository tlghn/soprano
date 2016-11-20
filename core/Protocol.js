/**
 * Created by tolgahan on 03.11.2016.
 */

"use strict";
const Slave = require('./Slave');
const errors = require('./errors');
const Symbols = require('./symbols');
const Disposable = require('./Disposable');
const stream = require('stream');
const Stream = stream.Stream;
const EventBridge = require('./EventBridge');
const awync = require('awync');
const FilterFactory = require('./FilterFactory');
const debug = require('./debug')();
const Reader = require('./Reader');
const Writer = require('./Writer');

class Protocol extends Slave {

    constructor(soprano, superClass = void 0){
        super(soprano, superClass || Protocol);
        this.setResource(Symbols.middlewares, new Set());
    }

    /**
     * @param options {*}
     * @param writeHeader {boolean}
     * @returns {SopranoClient}
     * @protected
     */
    *_connect(options, writeHeader = true){
        let Soprano = require('./Soprano');
        let connection = yield Soprano.connect(this, options);
        connection.on('reconnected', function (conn) {
            awync(this.writeHeader.bind(this, conn));
        }.bind(this, connection));
        if(writeHeader){
            yield this.writeHeader(connection);
        }
        debug('%s >> client ready on %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);
        yield connection;
    }

    *_callMiddleWares(){
        let middleWares = this.getResource(Symbols.middlewares);
        let args = Array.prototype.slice.call(arguments);
        args.unshift(void 0);

        for(let middleWare of middleWares){
            let f = middleWare.bind.apply(middleWare, args);
            yield f();
        }
    }

    /**
     * @returns {Number}
     */
    *getMaxHeaderLength(){
        yield 0;
    }

    /**
     * @returns {Number}
     */
    *getMinHeaderLength(){
        yield this.getMaxHeaderLength();
    }

    //noinspection JSMethodCanBeStatic
    /**
     * @param connection SopranoClient
     */
    *writeHeader(connection) {
        throw new errors.NotImplementedError();
    }

    use(middleware){
        if(typeof middleware !== 'function'){
            throw new errors.InvalidArgumentError('middleware must be a function');
        }
        let mw = this.getResource(Symbols.middlewares);
        mw.add(middleware);
        return this;
    }

    unuse(middleware){
        let mw = this.getResource(Symbols.middlewares);
        mw.delete(middleware);
        return this;
    }

    get middleWares(){
        return this.getResource(Symbols.middlewares);
    }

    /**
     * @returns {FilterFactory|undefined}
     */
    get filterFactory(){
        return this.getResource(Symbols.filterFactory);
    }

    set filterFactory(/*FilterFactory|undefined*/value){
        if(typeof value !== 'undefined' && !(value instanceof FilterFactory)){
            throw new errors.InvalidArgumentError('value must be FilterFactory');
        }
        if(value){
            this.setResource(Symbols.filterFactory, value, true);
        } else {
            this.deleteResource(Symbols.filterFactory);
        }
    }

    /**
     * @returns {Array.<Stream>|Stream|undefined}
     */
    *createOutputFilter(){
        let factory = this.filterFactory;
        if(factory){
            yield factory.createOutputFilter();
        }
    }

    /**
     * @returns {Array.<Stream>|Stream|undefined}
     */
    *createInputFilter(){
        let factory = this.filterFactory;
        if(factory){
            yield factory.createInputFilter();
        }
    }

    /**
     * @param sopranoClient {SopranoClient|undefined}
     * @param data {*}
     * @returns {Stream|undefined}
     */
    createInput(sopranoClient = void 0, data = void 0){}

    /**
     * @param sopranoClient {SopranoClient|undefined}
     * @param data {*}
     * @returns {Stream|undefined}
     */
    createOutput(sopranoClient = void 0, data = void 0){}


    //noinspection JSMethodCanBeStatic
    /**
     * @returns {boolean}
     */
    canUseSopranoFilters(){
        return true;
    }


    /**
     * Checks if buffer matches with current protocol's header
     *
     * If buffer does not have the enough length to determine if matches, then
     * function should yield {false}
     *
     * If buffer matches with the header then function should yield itself
     *
     * If buffer has enough length but does not match with protocol's header then
     * function should yield {null} 
     *
     * @param buffer Buffer
     * @param startIndex Number
     * @param endIndex Number
     * @yields null|false|Object
     */
    *matchHeader(buffer, startIndex, endIndex) {
        throw new errors.NotImplementedError();
    }

    /**
     * @param connection {SopranoClient}
     * @param header {Buffer}
     */
    handover(connection, header) {
        throw new errors.NotImplementedError();
    }
}


Disposable.attach(Protocol);

module.exports = Protocol;