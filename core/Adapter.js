/**
 * Created by tolgahan on 16.11.2016.
 */
"use strict";
const Controller = require('./Controller');
const Disposable = require('./Disposable');
const EventEmitter = require('awync-events');

const errors = require('./errors');

class Adapter extends EventEmitter {

    *getCount(){
        throw new errors.NotImplementedError();
    }

    /**
     * @returns {Array.<*>}
     */
    *getIds(){
        throw new errors.NotImplementedError();
    }

    /**
     * @param controller {Controller}
     * @returns {Controller}
     */
    *add(controller){
        throw new errors.NotImplementedError();
    }

    /**
     * @param id {*}
     */
    *remove(id){
        throw new errors.NotImplementedError();
    }

    /**
     * @param ids {Array.<*>|*}
     * @param state {Object}
     */
    *setState(ids, state){
        throw new errors.NotImplementedError();
    }

    /**
     * @param state {Object}
     */
    *findIds(state){
        throw new errors.NotImplementedError();
    }

    /**
     * @param ids {Array.<*>}
     * @param data {*}
     */
    *post(ids, data){
        throw new errors.NotImplementedError();
    }
}

Disposable.attach(Adapter);

module.exports = Adapter;