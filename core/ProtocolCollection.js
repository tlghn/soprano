/**
 * Created by tolgahan on 04.11.2016.
 */
"use strict";
const Protocol = require('./Protocol');
const Symbols = require('./symbols');
const errors = require('./errors');
const awync = require('awync');

class ProtocolCollection extends Protocol {
    
    constructor(soprano){
        super(soprano);
        if(this.constructor === ProtocolCollection){
            throw new errors.AbstractError('ProtocolCollection class is abstract.');
        }
    }

    *getMaxHeaderLength(){
        let max = 0;
        for(let protocol of this.getProtocols()){
            let current = yield protocol.getMaxHeaderLength();
            if(current > max){
                max = current;
            }
        }
        yield max;
    }

    *getMinHeaderLength(){
        let min = yield this.getMaxHeaderLength();

        for(let protocol of this.getProtocols()){
            let current = yield protocol.getMinHeaderLength();
            if(current < min){
                min = current;
            }
        }
        yield min;
    }


    *bind(protocol, options){
        throw new errors.NotImplementedError();
    }

    *getProtocols(){
        throw new errors.NotImplementedError();
    }


    *matchHeader(buffer, startIndex, endIndex){
        var needMoreData = false;

        for(let protocol of this.getProtocols()){
            let result = yield protocol.matchHeader(buffer, startIndex, endIndex);
            if(result === null){
                continue;
            }

            if(result === false){
                needMoreData = true;
                continue;
            }

            if(result instanceof Protocol){
                yield result;
                return;
            }
        }

        if(needMoreData){
            yield false;
        } else {
            yield null;
        }
    }


    [Symbol.iterator](){
        return this.getProtocols();
    }

    static checkIfBindable(name, constructor){
        if(!Protocol.isPrototypeOf(constructor)){
            throw new errors.BindingError(name + ' is not prototype of Protocol');
        }
    }
}

class Unique extends ProtocolCollection {
    
    constructor(soprano){
        super(soprano);
        this.setResource(Symbols.protocols, new Set());
    }

    /**
     * @returns Set
     * @private
     */
    get _protocols(){
        return this.getResource(Symbols.protocols);
    }

    /**
     * @yield Protocol
     */
    *getProtocols(){
        for(let value of this._protocols){
            yield value;
        }
    }

    *bind(protocol, options){
        ProtocolCollection.checkIfBindable('protocol', typeof protocol === 'object' && protocol.constructor);

        var protocols = this._protocols;

        if(protocols.has(protocol)){
            throw new errors.BindingError('This protocol has already been binded');
        }

        if(protocol.soprano !== this.soprano){
            throw new errors.BindingError('This protocol is belong to another soprano instance');
        }
        this._protocols.add(protocol);
        
        yield protocol;
    }

    _onDispose(){
        delete this[Symbols.protocols];
    }


}

ProtocolCollection.Unique = Unique;

module.exports = ProtocolCollection;