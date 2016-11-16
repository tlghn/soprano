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
}

module.exports = Utils;