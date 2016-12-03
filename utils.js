/**
 * Created by tolgahan on 16.11.2016.
 */

const errors = require('./core/errors');
const NEED_MORE_DATA = Symbol('needMoreData');
const DONE = Symbol('done');

class Utils {
    /**
     * @param number
     * @returns {Buffer}
     */
    static encodeUInt32(number){
        number = Number(number);
        var output = Buffer.allocUnsafe(5);

        if(isNaN(number) || !number){
            output.writeUInt8(0, 0);
            return output.slice(0, 1);
        }

        if(number < 0){
            throw new errors.InvalidArgumentError('number must be positive');
        }

        var index = 0;
        while (number > 0){
            var bits = number & 0x7f;
            number >>= 7;
            if(number > 0) {
                bits |= 0x80;
            }
            output.writeUInt8(bits, index++);
        }

        return output.slice(0, index);
    }

    /**
     * @param buffer {Buffer}
     * @returns {*}
     */
    static decodeUInt32(buffer){

        if(!(buffer instanceof Buffer)){
            throw new errors.InvalidArgumentError('buffer must be Buffer');
        }

        var more = true;
        var value = 0;
        var index = 0;
        while (more)
        {
            if(index >= buffer.length){
                return {
                    status: NEED_MORE_DATA
                };
            }

            var lower7bits = buffer.readUInt8(index);
            more = (lower7bits & 128) != 0;
            value |= (lower7bits & 0x7f) << (index++ * 7);
        }

        return {
            status: DONE,
            value,
            buffer: buffer.slice(index)
        };
    }

    static async sleep(delay = 0){
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    static async callback(func){
        return new Promise(function(request, resolve, reject) {
            var func = request[0];
            request[0] = null;
            request.push(function (resolve, reject) {
                var args = Array.prototype.slice.call(arguments, 2);
                if(args[0] instanceof Error){
                    args[0].callbackArgs = args;
                    return reject(args[0]);
                }
                if(Array.isArray(args) && args.length === 1){
                    args = args[0];
                }
                resolve(args);
            }.bind(null, resolve, reject));
            (func.bind.apply(func, request))();
        }.bind(null, Array.from(arguments)));
    }
    
    static async errorOrResult(func){
        var args = Array.from(arguments);
        args.unshift(Utils);
        let f = Utils.callback.bind.apply(Utils.callback, args);
        let result = await f();
        if(Array.isArray(result)){
            
            if(result[0] === null){
                result.shift();
            }
            
            if(result.length === 1) {
                result = result[0];
            }
        }
        return result;
    }
}

Utils.DONE = DONE;
Utils.NEED_MORE_DATA = NEED_MORE_DATA;

module.exports = Utils;