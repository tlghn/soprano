/**
 * Created by tolgahan on 13.11.2016.
 */
"use strict";

const stream = require('stream');

class EndlessStream extends stream.PassThrough {
    end(chunk, encoding, callback){
        if(chunk){
            return this.write(chunk, encoding, callback);
        }

        if(typeof encoding === 'function'){
            callback = encoding;
            encoding = null;
        }

        if(typeof callback === 'function'){
            callback();
        }
    }
}

module.exports = EndlessStream;