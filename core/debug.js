/**
 * Created by tolgahan on 17.11.2016.
 */
const util = require('util');

module.exports = function () {
    console.log(util.format.apply(util, Array.prototype.slice.call(arguments)));
};