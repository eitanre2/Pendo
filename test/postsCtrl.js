"use strict";
var assert = require('chai').assert;
var TestCommon = require('./test_common');

function PostTest(ctrl) {
    TestCommon.call(this);
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
        it('Create new Post', function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            test.setup = function (prepare, setupDone) {
                prepare.newPost = this.createPost("My post example title", "My post body");
                setupDone();
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
            test.setup = function (prepare, setupDone) {
                prepare.newPost = this.createPost("My post(draft) example title", "My post(draft) body");
                setupDone();
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
                        } else {
                            runDone();
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

        it('Vote only once by user', function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            test.times = 2;
            test.setup = function (prepare, setupDone) {
                prepare.newPost = this.createPost("My post example title", "My post body");
                prepare.votes = 0;
                test.ctrl.createPost(test.userId, test.prepare.newPost, function (err, newPostId) {
                    prepare.postId = newPostId;
                    setupDone();
                });
            };
            test.run = function (prepare, runDone) {
                test.ctrl.votePost(test.userId, prepare.postId, 1, function (err, result) {
                    test.prepare.votes += result ? 1 : 0;
                    //get the post again (to have its score)
                    if (result) {
                        test.ctrl.getPost(prepare.postId, function (err, post) {
                            test.prepare.votedPost = post;
                            runDone();
                        });
                    } else {
                        runDone();
                    }
                });
            };

            test.verify = function (expected) {
                assert.equal(test.prepare.votes, 1);
                //assert.equal(test.prepare.votedPost.score, 1);
                done();
            };

            postsCtrl.init(function (err) {
                assert.isTrue(!err);
                //start test only when ready with good connection
                test.test();
            });
        });

        it('Vote more than once by multiple users', function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            var times2Run = 4;
            test.times = times2Run;
            test.setup = function (prepare, setupDone) {
                prepare.newPost = this.createPost("My post example title", "My post body");
                prepare.votes = 0;
                test.ctrl.createPost(test.userId, test.prepare.newPost, function (err, newPostId) {
                    test.prepare.postId = newPostId;
                    setupDone();
                });

            };
            test.run = function (prepare, runDone) {
                var userId = test.currentTime;
                test.ctrl.votePost(userId, test.prepare.postId, 1, function (err, result) {
                    //counts the succefull votes
                    test.prepare.votes += result ? 1 : 0;
                    runDone();
                });
            };

            test.verify = function (expected) {
                assert.equal(test.prepare.votes, times2Run);
                done();
            };

            postsCtrl.init(function (err) {
                assert.isTrue(!err);
                //start test only when ready with good connection
                test.test();
            });
        });

        it("Should return valid 'Top-Posts'", function (done) {
            var postsCtrl = postsCtrlCreator();
            var test = new PostTest(postsCtrl);
            var times2Run = 51;
            test.times = times2Run;
            test.setup = function (prepare, setupDone) {
                prepare.newPost = this.createPost("My post example title", "My post body");
                prepare.votes = 0;
                prepare.posts = [];
                setupDone();
            };
            test.run = function (prepare, runDone) {
                //for the first 10 times - create posts
                if (test.currentTime <= 10) {
                    var post = this.createPost("My post #" + test.currentTime, "My post body");
                    post.score = 0;
                    prepare.posts.push(post);
                    test.ctrl.createPost(test.userId, post, function (err, newPostId) {
                        post.postId = newPostId;
                        runDone();
                    });
                    //then - let 50 users to vote
                } else if (10 < test.currentTime && test.currentTime <= 50) {
                    var userId = test.currentTime;
                    var score = test.currentTime % 2 == 0 ? 3 : 4;
                    var post = prepare.posts[userId % 10];
                    post.score += score;
                    test.ctrl.votePost(userId, post.postId, score, function (err, result) {
                        runDone();
                    });
                    //finally, get top posts
                } else {
                    test.ctrl.getTopPosts(function (err, result) {
                        prepare.topPosts = err ? undefined : result;
                        runDone();
                    });
                }
            };

            test.verify = function (expected) {
                assert.notEqual(test.prepare.topPosts, undefined);
                assert.isTrue(test.prepare.topPosts.length <= test.ctrl.topPostsLimit);
                //sort local array to compare with return array
                test.prepare.posts.sort(function (a, b) {
                    if (a.score > b.score) {
                        return -1;
                    }
                    if (a.score == b.score) {
                        if (a.creation > b.creation) { return -1; }
                        if (a.creation === b.creation) { return 0; }
                        if (a.creation < b.creation) { return 1; }
                    }
                    if (a.score < b.score) {
                        return 1;
                    }
                });

                var sortedPosts = test.prepare.posts.slice(0, Math.min(test.prepare.posts.length, test.ctrl.topPostsLimit));
                assert.equal(sortedPosts.length, test.prepare.topPosts.length);
                for (var i = 0; i < sortedPosts.length; i++) {
                    assert.equal(sortedPosts[i].postId, test.prepare.topPosts[i].postId);
                    assert.equal(sortedPosts[i].score, test.prepare.topPosts[i].score);
                    assert.equal(sortedPosts[i].creation, test.prepare.topPosts[i].creation);
                }
                //validate the posts are sorted and really the top.
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
    },
    {
        name: "rethinkDB Posts",
        creator: function () {
            var m = require('../controllers/posts');
            return new m();
        }
    }

];

for (var i = 0; i < impls.length; i++) {
    DeclareTests(impls[i].name, impls[i].creator);
}
