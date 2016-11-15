/**
 * Created by tolgahan on 07.11.2016.
 */
"use strict";

const Disposable = require('./Disposable');
const Symbols = require('./symbols');
const EE = require('events');

class DisposableMap extends Map {

    constructor(target){
        super();
        this[Symbols.target] = target;
        if(target instanceof EE && Disposable.isDisposable(target)){
            target.on('disposed', () => this.dispose());
        }
    }

    _onDispose(){
        for(let value of this.values()){
            if(Disposable.isDisposable(value)){
                value.dispose();
            }
        }
        this.clear();
        
        delete this[Symbols.target];
    }

    get(key){
        let value = super.get(key);
        if(value instanceof WeakMap){
            return value.get(this);
        }
        return value;
    }
    
    delete(key){
        if(!this.has(key)){
            return false;
        }
        
        var value = super.get(key);
        if(value instanceof WeakMap){
            value.delete(this);
        } else {
            if(Disposable.isDisposable(value)){
                value.dispose();
            }
        }
        return super.delete(key);
    }
    
    set(key, value, weak){
        if(this.has(key) && this.get(key) !== value){
            this.delete(key);
        }
        if(weak){
            var map = new WeakMap();
            map.set(this, value);
            value = map;
        }
        super.set(key, value);
    }
}

Disposable.attach(DisposableMap);


module.exports = DisposableMap;
