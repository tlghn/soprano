/**
 * Created by tolgahan on 04.11.2016.
 */

"use strict";

const calp = require('calp');
const Symbols = require('./symbols');
const awync = require('awync');
const errors = require('./errors');

const Disposable = require('./Disposable');
const DisposableMap = require('./DisposableMap');

class MethodCollection extends Disposable {
    constructor(){
        super();
    }

    register(name, generatorFunc){
        if(!awync.isGeneratorFunction(generatorFunc)){
            throw new errors.InvalidArgumentError('generatorFunc is not a generator function');
        }
        this.setResource(name, generatorFunc);
        return this.wrap();
    }

    *execute(name, args){
        if(!this.hasResource(name)){
            throw new errors.InvalidOperationError('Method not found', {name});
        }
        if(!Array.isArray(args)){
            if(typeof args === 'undefined'){
                args = [];
            } else {
                args = [args];
            }
        }
        let method = this.getResource(name);
        yield method.apply(null, args);
    }

    wrap(){
        return calp(this.register, this, Symbols.namespace);
    }
    
    _onDispose(){
        calp.destroy(this.register, this, Symbols.namespace);
    }
}

module.exports = MethodCollection;