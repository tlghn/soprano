/**
 * Created by tolgahan on 16.11.2016.
 */
"use strict";
const Controller = require('./Controller');
const Disposable = require('./Disposable');
const EventEmitter = require('./EventEmitter');

const errors = require('./errors');

class Adapter extends EventEmitter {

    async getCount(){
        throw new errors.NotImplementedError();
    }

    /**
     * @returns {Array.<*>}
     */
    async getIds(){
        throw new errors.NotImplementedError();
    }

    /**
     * @param controller {Controller}
     * @returns {Controller}
     */
    async add(controller){
        throw new errors.NotImplementedError();
    }

    /**
     * @param id {*}
     */
    async remove(id){
        throw new errors.NotImplementedError();
    }

    /**
     * @param ids {Array.<*>|*}
     * @param state {Object}
     */
    async setState(ids, state){
        throw new errors.NotImplementedError();
    }

    /**
     * @param state {Object}
     */
    async findIds(state){
        throw new errors.NotImplementedError();
    }

    /**
     * @param ids {Array.<*>}
     * @param data {*}
     */
    async post(ids, data){
        throw new errors.NotImplementedError();
    }
}

Disposable.attach(Adapter);

module.exports = Adapter;