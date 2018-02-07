"use strict";
var assert = require('assert');


function TestCommon() {
    /**@member {number} - number of times to run test (will execute 'run' function) */
    this.times = 1;
    /**@member {number} - number of times run was called */
    this.currentTime = 0;
}

TestCommon.prototype.setup = function (prepare, setupDone) {
    //Should be overwrite by subclass
    assert.fail();
}

TestCommon.prototype.test = function (prepare, expected, runFunc) {
    prepare = this.prepare = prepare || {};
    expected = this.expected = expected || {};

    var test = this;
    this.setup(prepare, function () {
        test.runAfterSetup(prepare, expected);
    });
}
TestCommon.prototype.runAfterSetup = function (prepare, expected) {
    var test = this;
    test.currentTime++;
    test.run(prepare, function () {
        test.times--;

        if (test.times > 0) {
            test.runAfterSetup(prepare, expected);
        } else {
            test.verify(expected);
            test.clean();
        }
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
