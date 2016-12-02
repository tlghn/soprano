/**
 * Created by tolgahan on 02.12.2016.
 */
"use strict";

const EE = require('events');
const util = require('util');

const WHEN = Symbol('when');
const WHATEVER = Symbol('when');
const EMIT = Symbol('emit');
const EVENT_EMITTER = Symbol('EventEmitter');
const Id = require('./Id');
const WHICEVER_COUNT = new Id();

function whichever() {

    return async function () {
        var args = Array.prototype.slice.call(arguments);

        if(!args.length) {
            return void 0;
        }

        return (function (eventName, args) {

            var handlers = args.map(name => {
                return {name, cb: handler.bind(this, name)}
            });

            function handler(name) {
                handlers.forEach(item => {
                    this.removeListener(item.name, item.cb);
                });

                var args = Array.prototype.slice.call(arguments, 1);
                if(args[0] instanceof Error){
                    args[0].eventName = name;
                    args[0].eventArgs = args;
                    args = args[0];
                } else {
                    args = {eventName: name, eventArgs: args};
                }

                this.emit(eventName, args);
            }

            handlers.forEach(item => this.on(item.name, item.cb));
            
            var on = this.on.bind(this, eventName);
            
            return new Promise((resolve, reject) => {
                on(function (args) {
                    if(args instanceof Error){
                        return reject(args);
                    }
                    resolve(args);
                });
            });

        }.bind(this, 'soprano-events-whicever-' + WHICEVER_COUNT.next(), args))();

    }.bind(this);

}

function whatever() {
    if(this[WHATEVER]){
        return this[WHATEVER];
    }

    this[EMIT] = this.emit;
    this.emit = function () {
        var args = Array.prototype.slice.call(arguments);
        this[EMIT].apply(this, args);
        var name = args.shift();
        if(args[0] instanceof Error){
            args[0].eventArgs = args;
            args[0].eventName = name;
            args = args[0];
        } else {
            args = {eventName: name, eventArgs:args};
        }
        this[EMIT]('soprano-events-whatever', args);
    };

    function eventHandler(eventHost, resolve, reject, args) {
        this.removeListener('soprano-events-whatever', eventHost.eventHandler);
        if(args instanceof Error){
            return reject(args);
        }
        resolve(args);
    }

    return this[WHATEVER] = async function () {
        return new Promise((resolve, reject) => {
            var eventHost = {};
            this.on(
                'soprano-events-whatever', 
                eventHost.eventHandler = eventHandler.bind(this, eventHost, resolve, reject)
            );
        })
    };
}

function when() {
    
    function eventHandler(eventHost, resolve, reject) {
        
        var args = Array.prototype.slice.call(arguments, 3);
        
        if(args[0] instanceof Error){
            args[0].eventArgs = args;
            args[0].eventName = eventHost.eventName;
            args = args[0];
        } else {
            args = {eventName: eventHost.eventName, eventArgs: args};
        }
        
        this.removeListener(eventHost.eventName, eventHost.eventHandler);
        
        if(args instanceof Error){
            return reject(args);
        }
        
        resolve(args);
    }
    
    return this[WHEN] || (this[WHEN] = new Proxy({}, {
            get: (target, prop) => async function(name){
                return new Promise((resolve, reject) => {
                    var eventHost = {eventName: name};
                    this.on(
                        name,
                        eventHost.eventHandler = eventHandler.bind(this, eventHost, resolve, reject)
                    )
                });
            }.bind(target, prop)
        }));
}

function EventEmitter() {
    if (!(this instanceof EventEmitter)) {
        return EventEmitter.attach(arguments[0]);
    }
}

util.inherits(EventEmitter, EE);

EventEmitter.prototype.when = async function () {
};
EventEmitter.prototype.whatever = async function () {
};
EventEmitter.prototype.whichever = async function () {
};

EventEmitter.attach = function (target) {
    if(typeof target === 'function'){
        if(!target.prototype){
            return;
        }
        target = target.prototype;
    }

    if(typeof target !== 'object' || !target || target[EVENT_EMITTER]){
        return target;
    }

    target[EVENT_EMITTER] = true;

    Object.defineProperties(target, {
        when: { get: when },
        whatever: {get: whatever },
        whichever: {get: whichever }
    });

    return target;
};

EventEmitter.attach(EventEmitter.prototype);

module.exports = EventEmitter;