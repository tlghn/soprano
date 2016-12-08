/**
 * Created by tolgahan on 17.11.2016.
 */
const stream = require('stream');

class JSONTransformer extends stream.Transform {
    constructor(input = true){
        super({readableObjectMode: input, writableObjectMode: !input});
        this.__input = input;
    }

    _transform(data, encoding, cb){
        try{
            if(this.__input){
                cb(null, JSON.parse(data.toString('utf8')));
            } else {
                cb(null, Buffer.from(JSON.stringify(data), 'utf8'));
            }
        }catch (err){
            cb(err);
        }
    }
}

module.exports = JSONTransformer;