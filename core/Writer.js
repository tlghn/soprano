/**
 * Created by tolgahan on 19.11.2016.
 */

"use strict";

const stream = require('stream');

class Writer {

    constructor(outputs, net){
        if(outputs instanceof stream.Stream && net === void 0){
            net = outputs;
            outputs = [];
        }
        outputs.forEach(function (stream) {
            stream.pause();
        });
        this._outputs = outputs;
        this._net = net;
    }

    async write(data, encoding){
        return new Promise((resolve, reject) => {
            (this._outputs[0] || this._net).write(data, encoding, function (err) {
                if(err) return reject(err);
                return resolve();
            })
        });
    }

    async _transfer(from, to){
        return new Promise((resolve, reject) => {

            function onReadable() {
                function readNext(err) {
                    if(err){
                        return reject(err);
                    }
                    var chunk = from.read();
                    if(chunk === null){
                        var rs = from._readableState;
                        if(rs && rs.objectMode){
                            return to.write(chunk, function (err) {

                                if(err) {
                                    return readNext(err);
                                }

                                if(rs.ended) {
                                    if(!rs.endEmitted){
                                        return from.end();
                                    }
                                    return;
                                }

                                readNext();
                            });
                        } else {
                            return from.end();
                        }
                    }
                    to.write(chunk, readNext);
                }

                readNext();
            }

            function onEnd(err) {
                from.removeListener('readable', onReadable);
                from.removeListener('end', onEnd);
                from.removeListener('error', onEnd);
                to.removeListener('error', onEnd);
                if(err instanceof Error) return reject(err);
                resolve(err);
            }

            if(typeof from.flush === 'function'){
                from.flush();
            }
            from.on('readable', onReadable);
            from.on('end', onEnd);
            from.on('error', onEnd);
            to.on('error', onEnd);
        });
    }

    async end(data, encoding){
        if(data){
            await this.write(data, encoding);
        }
        var current = this._outputs.shift();
        while (current){
            var next = this._outputs.shift();
            await this._transfer(current, next || this._net);
            current = next;
        }

        delete this._outputs;
        delete this._net;
    }
}

module.exports = Writer;