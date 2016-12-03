/**
 * Created by tolgahan on 17.11.2016.
 */
const path = require('path');
const root = path.normalize(path.dirname(require.main.filename));
const SEP = path.normalize('/');
const NODE_MODULES = `${SEP}node_modules${SEP}`;

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

    currentfile = path.normalize(currentfile);

    let modulesIndex = callerfile.indexOf(NODE_MODULES);
    let appPath = root;
    if(modulesIndex > -1){
        appPath = callerfile.substr(0, callerfile.indexOf(SEP, modulesIndex + NODE_MODULES.length + 1));
    }

    let appName = path.basename(appPath);

    return `${appName}:${path.basename(callerfile.substr(appPath.length + 1).replace(/\\+|\/+/g, ':'), '.js')}`;
}

module.exports = function () {
    return require('debug')(_getCallerFile());
};