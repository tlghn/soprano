/**
 * Created by tolgahan on 07.11.2016.
 */

"use strict";

class FilterFactory {
    async createInputFilter() {}
    async createOutputFilter() {}
}

FilterFactory.defaultFactory = new FilterFactory();

module.exports = FilterFactory;