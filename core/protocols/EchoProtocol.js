/**
 * Created by tolgahan on 14.11.2016.
 */

"use strict";
const FHRRP = require('./FixedHeaderRequestResponseProtocol');
const LengthPrefixedTransformer = require('../transformers/LengthPrefixedTransformer');
const debug = require('../debug')();

class EchoProtocol extends FHRRP {

    constructor(soprano){
        super(soprano, Buffer.from('ECHO'));
    }

    *echo(msg){
        debug('Sending %s', msg);
        yield String(yield this._execute(msg));
    }

    *handle(err, msg, connection){
        if(err) {
            debug('Receive failed with %s', err);
            yield err;
        } else {
            debug('Received:%s', msg);
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