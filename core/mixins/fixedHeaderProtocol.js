/**
 * Created by tolgahan on 17.11.2016.
 */

"use strict";

const Symbols = require('../symbols');
const errors = require('../errors');
const FIXED_HEADER_PROTOCOL = Symbol('fixedHeaderProtocol');

class FixedHeaderProtocolMixin {

    _initFixedHeader(header){
        if(!(header instanceof Buffer)){
            throw new errors.InvalidArgumentError('buffer must be instance of Buffer');
        }
        this.setResource(Symbols.header, header);
    }

    _getHeader(){
        return this.getResource(Symbols.header);
    }

    *getMaxHeaderLength(){
        yield this._getHeader().length;
    }

    *writeHeader(connection) {
        yield connection.write(this._getHeader());
    }

    *matchHeader(buffer, startIndex, endIndex) {
        let header = this._getHeader();
        let len = endIndex - startIndex;
        let result = buffer.compare(header, 0, Math.min(len, header.length), startIndex, endIndex);
        if(result){
            yield null;
        } else if(len >= header.length) {
            yield this;
        } else {
            yield false;
        }
    }
}

module.exports = function (target) {
    if(typeof target === 'function'){
        target = target.prototype;
    }

    if(!target || target[FIXED_HEADER_PROTOCOL]){
        return false;
    }

    var props = Object.getOwnPropertyNames(FixedHeaderProtocolMixin.prototype)
        .reduce((prev, cur) => {
            prev[cur] = FixedHeaderProtocolMixin.prototype[cur];
            return prev;
        }, {});

    delete props.constructor;

    Object.assign(target, props);

    return target[FIXED_HEADER_PROTOCOL] = true;
};