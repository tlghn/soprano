/**
 * Created by tolgahan on 19.11.2016.
 */

"use strict";


class Reader {
    constructor(net, inputs){
        net.pause();
        this._net = net;
        this._inputs = inputs;

        net.pause();
        inputs.forEach(input => input.pause());
    }

    *read(){
        yield new Promise((resolve, reject) => {

            var net = this._net;
            var inputs = this._inputs;

            inputs.forEach(input => {
                input.on('error', onResult);
            });

            net.on('error', onResult);
            net.on('readable', onReadable);

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
                var chunk = net.read();
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


        });
    }

    *release(){
        this._net.resume();
        delete this._net;
        delete this._inputs;
    }
}

module.exports = Reader;