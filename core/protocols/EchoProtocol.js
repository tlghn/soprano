/**
 * Created by tolgahan on 14.11.2016.
 */

"use strict";
const FHRRP = require('./FixedHeaderRequestResponseProtocol');
const LengthPrefixedTransformer = require('../transformers/LengthPrefixedTransformer');

class EchoProtocol extends FHRRP {

    constructor(soprano){
        super(soprano, Buffer.from('ECHO'));
    }

    *echo(msg){
        yield String(yield this._execute(msg));
    }

    *handle(err, msg, connection){
        if(err) {
            yield err;
        } else {
            yield 'ECHO: ' + msg;
        }
    }

    createInput(){
        return new LengthPrefixedTransformer(true);
    }

    createOutput() {
        return new LengthPrefixedTransformer(false);
    }
}

module.exports = EchoProtocol;