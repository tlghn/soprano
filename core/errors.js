/**
 * Created by tolgahan on 04.11.2016.
 */
const util = require('util');

class SopranoError extends Error {
    constructor(){
        super();
    }

    init(){
        var args = Array.prototype.slice.call(arguments, 0);
        var props;
        var message;

        if(args.length){
            if(typeof args[args.length - 1] === 'object'){
                props = args.pop();
            }
        }

        if(args.length){
            message = util.format.apply(null, args);
        }

        this.message = message;

        if(props){
            Object.assign(this, props);
        }

        this.name = this.constructor.name;

        Error.captureStackTrace && Error.captureStackTrace(this, this.constructor);

    }
}

function createError(name) {
    return eval('(class ' + name + ' extends SopranoError { constructor(){ super(); this.init.apply(this, arguments); } })');
}

module.exports = {
    createError,
    SopranoError,
    AbstractError: createError('AbstractError'),
    NotImplementedError: createError('NotImplementedError'),
    BindingError: createError('BindingError'),
    InvalidArgumentError: createError('InvalidArgumentError'),
    InvalidOperationError: createError('InvalidOperationError'),
    InvalidProtocolError: createError('InvalidProtocolError'),
    ObjectDisposedError: createError('ObjectDisposedError'),
};