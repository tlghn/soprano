/**
 * Created by tolgahan on 17.11.2016.
 */
"use strict";

const stream = require('stream');
const utils = require('../../utils');

class LengthPrefixedTransformer extends stream.Transform {
    constructor(input = true){
        super();
        this.__input = input;
    }

    _transform(buffer, encoding, callback){
        if(this.__input){
            if(!this.buffer){
                this.buffer = buffer;
            } else {
                this.buffer = Buffer.concat([this.buffer, buffer]);
            }

            if(typeof this.len === 'undefined'){
                var len = utils.decodeUInt32(this.buffer);
                if(len.status === utils.DONE){
                    this.len = len.value;
                    delete this.buffer;
                    return this._transform(len.buffer, encoding, callback);
                }
            } else {
                if(this.buffer.length >= this.len){
                    this.push(this.buffer.slice(0, this.len));
                    this.buffer = this.buffer.slice(this.len);
                    delete this.len;
                }
            }
            
        } else {
            var length = utils.encodeUInt32(buffer.length);
            this.push(length);
            this.push(buffer);
        }

        callback();
    }
}

module.exports = LengthPrefixedTransformer;