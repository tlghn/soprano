/**
 * Created by tolgahan on 03.11.2016.
 */

"use strict";
const Slave = require('./Slave');
const errors = require('./errors');
const Symbols = require('./symbols');
const awync = require('awync');
const Disposable = require('./Disposable');

class Protocol extends Slave {

    constructor(soprano, superClass = void 0){
        super(soprano, superClass || Protocol);
    }

    /**
     * @param options {*}
     * @param writeHeader {boolean}
     * @protected
     */
    *_connect(options, writeHeader = true){
        let Soprano = require('./Soprano');
        let connection = yield Soprano.connect(this, options);
        if(writeHeader){
            yield this.writeHeader(connection);
        }
        yield connection;
    }

    *getMaxHeaderLength(){
        yield 0;
    }

    *getMinHeaderLength(){
        yield this.getMaxHeaderLength();
    }

    /**
     * @param connection SopranoClient
     */
    *writeHeader(connection) {
        throw new errors.NotImplementedError();
    }

    *createOutputFilter(){
    }

    *createInputFilter(){
    }

    isSopranoFiltersEnabled(){
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
     * @param connection SopranoClient
     */
    handover(connection) {
        throw new errors.NotImplementedError();
    }
}


Disposable.attach(Protocol);


module.exports = Protocol;