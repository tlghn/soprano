/**
 * Created by tolgahan on 08.11.2016.
 */
"use strict";

const Disposable = require('./Disposable');
const errors = require('./errors');
const Symbols = require('./symbols');
const EE = require('events');

function defaultMapper(arg) {
    return arg;
}

class EventBridge extends Disposable {
    
    constructor(source, destination, mapper){
        super();
        
        if(this.constructor === EventBridge){
            throw new errors.AbstractError(EventBridge.name + ' is abstract');
        }

        if(!(source instanceof EE)){
            throw new errors.InvalidArgumentError('source must be EventEmitter instance');
        }

        if(!(destination instanceof EE)){
            throw new errors.InvalidArgumentError('destination must be EventEmitter instance');
        }

        if(typeof mapper !== 'function'){
            mapper = defaultMapper;
        }

        this.setResource(Symbols.target, destination, true);
        this.setResource(Symbols.src, source, true);
        this.setResource(Symbols.handlers, {});
        this.setResource(Symbols.map, mapper);
    }

    /**
     * @returns EE
     */
    get source(){
        return this.getResource(Symbols.src);
    }

    /**
     * @returns EE
     */
    get target() {
        return this.getResource(Symbols.target);
    }

    get handlers(){
        return this.getResource(Symbols.handlers);
    }

    get mapper(){
        return this.getResource(Symbols.map);
    }

    /**
     * @param events {String[]|String}
     * @param prefix {String}
     * @returns EventBridge
     */
    async bind(events, prefix = ''){
        let {source, target, handlers, mapper} = this;

        if(typeof events[Symbol.iterator] !== 'function'){
            events = [events];
        }
        
        for(let cur of events){
            if(!handlers.hasOwnProperty(cur)){
                var handler;
                handlers[cur] = handler = async function (source, mapper, name) {
                    var args = Array.prototype.slice.call(arguments, 3);
                    args = args.map(mapper);
                    var handler = this._handleBridgedEvent;
                    if(typeof handler === 'function'){
                        try{
                            let result = await handler.call(this, source, name, args);
                            if(result) {
                                return;
                            }
                        }catch (err){
                            name = 'error';
                            args = [err];
                        }
                    }

                    if(EE.listenerCount(this, name)){
                        args.unshift(name);
                        this.emit.apply(this, args);
                    }

                }.bind(target, source, mapper, prefix + cur);
                source.on(cur, handler);
            }            
        }

        return this;
    }

    /**
     * @param events {String[]|String|undefined}
     * @returns EventBridge
     */
    unbind(events = void 0){
        let {source, handlers} = this;

        if(typeof events === 'undefined'){
            events = Object.keys(handlers);
        } else if(!Array.isArray(events)){
            events = [events];
        }

        events.forEach(cur => {
            source.removeListener(cur, handlers[cur]);
            delete handlers[cur];
        });

        return this;
    }

    _onDispose(){
        this.unbind();
    }

    /**
     * @param source [EE}
     * @param target [EE}
     * @param events [string[]|string}
     * @param mapper {function|undefined}
     */
    static create(source, target, events, mapper = void 0){
        var bridge = new EventBridgeImpl(source, target, mapper);
        return bridge.bind(events);
    }
}


class EventBridgeImpl extends EventBridge {
    constructor(source, destination, mapper){
        super(source, destination, mapper);
    }
}

module.exports = EventBridge;