/**
 * Created by tolgahan on 04.11.2016.
 */

"use strict";

const calp = require('calp');
const Symbols = require('./symbols');
const awync = require('awync');
const errors = require('./errors');

class MethodCollection {
    constructor(){
        this[Symbols.methods] = new Map();
    }

    get methods(){
        return this[Symbols.methods];
    }

    register(name, generatorFunc){
        if(!awync.isGeneratorFunction(generatorFunc)){
            throw new errors.InvalidArgumentError('generatorFunc is not a generator function');
        }
        this.methods.set(name, generatorFunc);
        return this.wrap();
    }

    *execute(name, args){
        var methods = this.methods;
        if(!methods.has(name)){
            throw new errors.InvalidOperationError('Method not found', {name});
        }
        if(!Array.isArray(args)){
            if(typeof args === 'undefined'){
                args = [];
            } else {
                args = [args];
            }
        }
        let method = methods.get(name);
        yield method.apply(null, args);
    }

    wrap(){
        return calp(this.register, this);
    }
}

module.exports = MethodCollection;