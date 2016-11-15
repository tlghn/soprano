/**
 * Created by tolgahan on 14.11.2016.
 */

"use strict";
const RRP = require('./RequestResponseProtocol');
const Symbols = require('../symbols');
const errors = require('../errors');

class FixedHeaderRequestResponseProtocol extends RRP {
    /**
     * @param soprano {Soprano}
     * @param header {Buffer}
     */
    constructor(soprano, header){
        super(soprano);
        if(!(header instanceof Buffer)){
            throw new errors.InvalidArgumentError('buffer must be instance of Buffer');
        }
        this.setResource(Symbols.buffer, header);
    }

    /**
     * @returns {Buffer}
     * @private
     */
    get _header(){
        return this.getResource(Symbols.buffer);
    }


    *getMaxHeaderLength(){
        yield this._header.length;
    }

    *writeHeader(connection) {
        yield connection.write(this._header);
    }

    *matchHeader(buffer, startIndex, endIndex) {
        let header = this._header;
        if((endIndex - startIndex) < header.length){
            yield false;
        } else {
            var result = buffer.compare(header, 0, header.length, startIndex, endIndex);
            if(result){
                yield null;
            } else {
                yield this;
            }
        }
    }
}

module.exports = FixedHeaderRequestResponseProtocol;