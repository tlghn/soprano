/**
 * Created by tolgahan on 14.11.2016.
 */

"use strict";
const FHRRP = require('./FixedHeaderRequestResponseProtocol');

const stream = require('stream');
const ZEROS = Buffer.alloc(4);

class MessageTransformer extends stream.Transform {
    constructor(){
        super();
    }

    _transform(chunk, enc, cb){
        if(!this.buffer){
            this.buffer = chunk;
        } else {
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }

        let buffer = this.buffer;
        if(buffer.lastIndexOf(ZEROS) === buffer.length - ZEROS.length){
            delete this.buffer;
            cb(null, buffer);
        } else {
            cb();
        }
    }
}

class EchoProtocol extends FHRRP {

    constructor(soprano){
        super(soprano, Buffer.from('ECHO'));
    }

    *echo(msg){
        yield String(yield this._execute(msg + '\0\0\0\0'));
    }

    *handle(msg, connection){
        yield 'ECHO: ' + msg;
    }

    createInput(){
        return new MessageTransformer();
    }
}

module.exports = EchoProtocol;