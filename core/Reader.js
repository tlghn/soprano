/**
 * Created by tolgahan on 19.11.2016.
 */

"use strict";


class Reader {
    constructor(net, inputs = void 0){
        net.pause();
        if(!inputs) inputs = [];
        this._net = net;
        this._inputs = inputs;

        net.pause();
        inputs.forEach(input => input.pause());
    }

    async read(chunkSize = 0){
        if(isNaN(chunkSize)) {
            chunkSize = 0;
        }

        chunkSize = chunkSize > 0 ? [chunkSize] : [];

        return new Promise((resolve, reject) => {

            function transform(value, copy) {
                if(!copy.length){
                    return onResult(value);
                }
                var current = copy.shift();
                current.write(value, function (err) {
                    if(err){
                        return onResult(err);
                    }
                    var value = current.read();
                    if(value === null){
                        var rs = current._readableState;
                        if(rs && rs.objectMode && rs.ended){
                            return transform(null, copy);
                        }
                        return onReadable();
                    }
                    transform(value, copy);
                });
            }

            function onReadable() {
                net.removeListener('readable', onReadable);
                var chunk = net.read.apply(net, chunkSize);
                if(chunk === null) {
                    net.on('readable', onReadable);
                    return;
                }

                transform(chunk, inputs.slice());
            }

            function onResult(data){

                inputs.forEach(input => input.removeListener('error', onResult));
                net.removeListener('error', onResult);
                net.removeListener('readable', onReadable);

                if(data instanceof Error){
                    return reject(data);
                }

                resolve(data);
            }

            var net = this._net;
            var inputs = this._inputs;

            inputs.forEach(input => {
                input.on('error', onResult);
            });

            net.on('error', onResult);
            onReadable();
        });
    }

    async release(willResume = true){
        if(willResume || (typeof willResume === 'undefined')){
            this._net.resume();
        }
        delete this._net;
        delete this._inputs;
    }
}

module.exports = Reader;