/**
 * Created by tolgahan on 17.11.2016.
 */
const path = require('path');
const root = path.resolve(__dirname + '/../');
function _getCallerFile() {
    var originalFunc = Error.prepareStackTrace;

    var callerfile;
    try {
        var err = new Error();
        var currentfile;

        Error.prepareStackTrace = function (err, stack) { return stack; };

        currentfile = err.stack.shift().getFileName();

        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();

            if(currentfile !== callerfile) break;
        }
    } catch (e) {}

    Error.prepareStackTrace = originalFunc;

    return path.basename(callerfile.substr(root.length + 1).replace(/\\+|\/+/g, ':'), '.js');
}

module.exports = function () {
    return require('debug')('soprano:' + _getCallerFile());
};