/**
 * Created by tolgahan on 04.11.2016.
 */

"use strict";

const calp = require('calp');
const Symbols = require('./symbols');
const errors = require('./errors');

const Disposable = require('./Disposable');
const DisposableMap = require('./DisposableMap');

class MethodCollection extends Disposable {
    constructor(){
        super();
    }

    register(name, func){
        if(typeof func !== 'function'){
            throw new errors.InvalidArgumentError('func is not a function');
        }
        this.setResource(name, func);
        return this.wrap();
    }

    async execute(name, args){
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
        await method.apply(null, args);
    }

    wrap(){
        return calp(this.register, this, Symbols.namespace);
    }
    
    _onDispose(){
        calp.destroy(this.register, this, Symbols.namespace);
    }
}

module.exports = MethodCollection;