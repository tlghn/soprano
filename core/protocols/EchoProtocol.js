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

    async echo(msg){
        debug('Sending %s', msg);
        return String(await this._execute(msg));
    }

    async handle(err, msg, connection){
        if(err) {
            debug('Receive failed with %s', err);
            return err;
        }

        return msg;
    }

    createInput(){
        return new LengthPrefixedTransformer(true);
    }

    createOutput() {
        return new LengthPrefixedTransformer(false);
    }
}

module.exports = EchoProtocol;