/**
 * Created by tolgahan on 07.11.2016.
 */

"use strict";

const Symbols = require('./symbols');
const errors = require('./errors');
const DISPOSABLE = Symbol('disposable');
const DISPOSED = Symbol('disposed');
const EE = require('events');

class Disposable {

    getResource(key){
        let res = this[Symbols.resources];
        if(!res) return;

        if(!res.has(key)){
            return;
        }

        return res.get(key);
    }

    hasResource(key){
        let res = this[Symbols.resources];
        return res && res.has(key);
    }

    setResource(key, value, weak){
        const DisposableMap = require('./DisposableMap');

        let res = this[Symbols.resources] || (this[Symbols.resources] = new DisposableMap(this));
        res.set(key, value, weak);
    }

    deleteResource(key){
        let res = this[Symbols.resources];
        if(!res) return false;
        return res.delete(key);
    }

    isDisposed(){
        return !!this[DISPOSED];
    }
    
    throwIfDisposed(){
        if(!this.isDisposed()){
            return;
        }
        
        throw new errors.ObjectDisposedError();
    }

    dispose(){

        if(this[DISPOSED]) return;

        if(typeof this._onDispose === 'function'){
            this._onDispose();
        }

        this[DISPOSED] = true;

        let res = this[Symbols.resources];
        delete this[Symbols.resources];
        if(res){
            res.dispose();
        }

        if(this instanceof EE){
            this.emit('disposed');
            this.removeAllListeners();
        }

    }

    static attach(target){
        if(Disposable.isDisposable(target)){
            return;
        }

        if(typeof target === 'function'){
            if(!target.prototype) return;
            target = target.prototype;
        }

        if(typeof target !== 'object' || !target) {
            return;
        }

        let {dispose, hasResource, getResource, setResource, deleteResource, isDisposed, throwIfDisposed} = Disposable.prototype;

        Object.assign(target, {dispose, hasResource, getResource, setResource, deleteResource, isDisposed, throwIfDisposed});

        target[DISPOSABLE] = true;
    }

    static isDisposable(target){
        if(typeof target === 'function'){
            return target.prototype && !!target.prototype[DISPOSABLE];
        }

        if(typeof target === 'object' && target){
            return target[DISPOSABLE];
        }

        return false;
    }
}

Disposable.prototype[DISPOSABLE] = true;

module.exports = Disposable;