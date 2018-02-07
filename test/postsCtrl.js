"use strict";
var assert = require('chai').assert;
var TestCommon = require('./test_common');

function PostTest(ctrl) {
    this.counter = 0;
    this.startTime = Date.now();
    this.ctrl = ctrl;
    this.userId = "1";
}
PostTest.prototype = Object.create(TestCommon.prototype);
PostTest.prototype.constructor = PostTest;
//static counter to ensure all posts (cross tests) are different.
PostTest.counter = 0;

PostTest.prototype.comparePosts = function (p1, p2, expectedResult) {
    assert.isDefined(p1);
    assert.isDefined(p2);

    if (expectedResult === false) {
        assert.notEqual(p1.title, p2.title);
        assert.notEqual(p1.body, p2.body);
    } else {
        assert.equal(p1.title, p2.title);
        assert.equal(p1.body, p2.body);
    }
};

PostTest.prototype.createPost = function (title, body) {
    var post = {
        title: title,
        body: body
    };

    this._enumartePost(post);
    return post;
};

PostTest.prototype._enumartePost = function (post) {
    PostTest.counter++;
    post.title += "_" + this.startTime + "_" + PostTest.counter;
    post.body += "_" + this.startTime + "_" + PostTest.counter;
}
PostTest.prototype.clean = function (post) {
    if (!this.ctrl) {
        return;
    }
    this.ctrl.clean();
    this.ctrl = undefined;
}

function DeclareTests(name, postsCtrlCreator) {
    describe('Posts Test by ' + name, function () {
        this.timeout(0);
        it('Create new Post', function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            test.setup = function (prepare) {
                this.prepare = {
                    newPost: this.createPost("My post example title", "My post body")
                };
            };
            test.run = function (prepare, runDone) {
                var postId;
                test.ctrl.createPost(test.userId, test.prepare.newPost, function (err, newPostId) {
                    postId = newPostId;

                    test.ctrl.getPost(newPostId, function (err, post) {
                        test.prepare.newPostBack = post;
                        runDone();
                    });
                });
            };

            test.verify = function (expected) {
                assert.isDefined(test.prepare.newPostBack);
                test.comparePosts(test.prepare.newPostBack.post, test.prepare.newPost);
                done();
            };

            postsCtrl.init(function (err) {
                assert.isTrue(!err);
                //start test only when ready with good connection
                test.test();
            });
        });

        it('Update new Post', function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            test.setup = function (prepare) {
                this.prepare = {
                    newPost: this.createPost("My post(draft) example title", "My post(draft) body")
                };
            };
            test.run = function (prepare, runDone) {
                var postId;
                test.ctrl.createPost(test.userId, test.prepare.newPost, function (err, newPostId) {
                    postId = newPostId;
                    // create updated version of post
                    test.prepare.updatedPost = test.createPost("Updated post(draft) title", "Updated post(draft) body");
                    // update the post
                    test.ctrl.updatePost(test.userId, postId, test.prepare.updatedPost, function (err, result) {
                        test.prepare.updateResult = result;
                        if (result) {
                            test.ctrl.getPost(postId, function (err, post) {
                                test.prepare.returnUpdatedPost = post;
                                runDone();
                            });
                        }
                    });
                });
            };

            test.verify = function (expected) {
                assert.isTrue(test.prepare.updateResult);
                assert.isDefined(test.prepare.updatedPost);
                test.comparePosts(test.prepare.returnUpdatedPost.post, test.prepare.newPost, false);
                test.comparePosts(test.prepare.returnUpdatedPost.post, test.prepare.updatedPost, true);
                done();
            };

            postsCtrl.init(function (err) {
                assert.isTrue(!err);
                //start test only when ready with good connection
                test.test();
            });
        });
    });
}
var impls = [
    {
        name: "DummyPosts",
        creator: function () {
            var m = require('../controllers/posts_dummy');
            return new m();
        }
    }
];

for (var i = 0; i < impls.length; i++) {
    DeclareTests(impls[i].name, impls[i].creator);
}
