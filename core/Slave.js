/**
 * Created by tolgahan on 04.11.2016.
 */
"use strict";
const EE = require('awync-events');
const Symbols = require('./symbols');
const errors = require('./errors');
const Disposable = require('./Disposable');


class Slave extends EE {
    constructor(soprano, AbstractConstructor = void 0){
        super();

        if(this.constructor === AbstractConstructor){
            throw new errors.AbstractError(AbstractConstructor.name + ' class is abstract');
        }

        if(!(soprano instanceof require('./Soprano'))){
            throw new errors.InvalidArgumentError('soprano is not instance of Soprano');
        }

        this.setResource(Symbols.soprano, soprano, true);
    }

    get soprano(){
        return this.getResource(Symbols.soprano);
    }
}

Disposable.attach(Slave);

module.exports = Slave;