/**
 * Created by tolgahan on 08.11.2016.
 */
"use strict";

const Disposable = require('./Disposable');
const Symbols = require('./symbols');
const EE = require('events');

class DisposableSet extends Set {
    
    constructor(target){
        super();
        this[Symbols.target] = target;
        if(target instanceof EE && Disposable.isDisposable(target)){
            target.on('disposed', () => this.dispose());
        }
    }

    _onDispose(){
        for(let value of this){
            if(Disposable.isDisposable(value)){
                value.dispose();
            }
        }
        this.clear();
        delete this[Symbols.target];
    }

    add(value, weak){
        if(this.has(value)){
            if(weak){
                super.delete(value);
            } else {
                return this;
            }
        }

        if(weak){
            var map = new WeakMap();
            map.set(this, value);
            value = map;
        }

        if(value instanceof EE && Disposable.isDisposable(value)){
            value.on('disposed', () => super.delete(value));
        }

        super.add(value);
    }
}

Disposable.attach(DisposableSet);


module.exports = DisposableSet;