"use strict";
var assert = require('assert');


function TestCommon() {

}

TestCommon.prototype.setup = function (prepare) {
    //Should be overwrite by subclass
    assert.fail();
}

TestCommon.prototype.test = function (prepare, expected, runFunc) {
    var test = this;
    this.setup(prepare);
    (runFunc || this.run)(prepare, function () {
        test.verify(expected);
        test.clean();
    });
}

TestCommon.prototype.run = function (prepare, done) {
    //Should be overwrite by subclass
    assert.fail("run function hasn't been implemented yet");
}

TestCommon.prototype.repeat = function (expected) {
    this.run();
    this.verify(expected);
}

TestCommon.prototype.verify = function (expected) {
    //Should be overwrite by subclass
    assert.fail("verify function hasn't been implemented yet");
}

TestCommon.prototype.clean = function (expected) {
    //Should be overwrite by subclass
    assert.fail("clean function hasn't been implemented yet");
}

module.exports = TestCommon;
