/**
 * Created by tolgahan on 17.11.2016.
 */

"use strict";

const Symbols = require('../symbols');
const errors = require('../errors');
const FIXED_HEADER_PROTOCOL = Symbol('fixedHeaderProtocol');
const debug = require('../debug')();

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

    async getMaxHeaderLength(){
        return this._getHeader().length;
    }

    async writeHeader(connection) {
        return await connection.write(this._getHeader());
    }

    async matchHeader(buffer, startIndex, endIndex) {
        let header = this._getHeader();
        let len = endIndex - startIndex;
        let result = buffer.compare(header, 0, Math.min(len, header.length), startIndex, endIndex);
        
        if(result){
            return null;
        }

        if(len >= header.length) {
            return this;
        }

        return false;
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

    debug('FixedHeaderProtocolMixin mixin is applied on %s', target.constructor.name);

    return target[FIXED_HEADER_PROTOCOL] = true;
};