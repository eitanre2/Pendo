"use strict";
var r = require('rethinkdb');

/**
 * @typedef Post
 * @property {string} title - post's title
 * @property {string} body - post's body
 */

/**
* @typedef ScoredPost
* @property {Post} post - post
* @property {Post} creation - post creation time (epoch)
* @property {Number} upVote - post's current downVote counter
* @property {Number} downVote - post's current downVote counter
*/

/**
 * @constructor
 * @param {string?} host - rethinkDB host name. default 'localhost'
 * @param {number?} port - rethinkDB port number. default 28015
 * @param {string} dbName - rethinkDB database name. default 'pendoPostsDb'
 */
function Posts(host, port, topPostsLimit, dbName) {
    /**@member {string} - rethinkDB host name */
    this.host = host || 'localhost';
    /**@member {number} - rethinkDB port number */
    this.port = port || 28015;
    /**@member {number} - topPostsLimit number of top posts to get */
    this.topPostsLimit = topPostsLimit || 5;
    /**@member {number} - rethinkDB db name */
    this.dbName = dbName || 'pendoPostsDb';
    /**@member {object} current connection to rethinkDb */
    this.connection = null;
    /**@member {Array<ScoredPost>} topPosts connection to rethinkDb */
    this.topPosts = [];
    /**@member {numbers} hotPostsDays - number of days back to show posts */
    this.hotPostsDays = 10;
    /**@member {numbers} hotPostsPeriod - period back to keep see posts */
    this.hotPostsPeriod = this.hotPostsDays * (86400 * 1000);
}

/**
* Init this object
* @param {function} cb - ready callback. function(err)
* @returns {undefined} 
*/
Posts.prototype.init = function (cb) {
    var posts = this;
    r.connect({ host: this.host, port: this.port }, function (err, conn) {
        posts.connection = conn;
        posts.listen2TopPosts(posts.topPostsLimit, function (err, change, isRemoved) {
            if (err) {
                return;
            }
            change.postId = change.id;
            posts.handlePostUpdate(change, isRemoved);
        });

        cb(err);
    })
}

function calcScore(post) {
    return post.upVote - post.downVote;
}

Posts.prototype.handlePostUpdate = function (postChange, isRemoved) {
    var len = this.topPosts.length;
    var pastHotline = Date.now() - this.hotPostsPeriod;
    isRemoved = isRemoved || postChange.creation <= pastHotline;
    var found = false;
    var count = 0;
    var newPosts = [];
    var index = 0;
    var item;
    while (index < len && count < this.topPostsLimit) {
        if (isRemoved) {
            //ignore this item if removed
            if (this.topPosts[index].postId !== postChange.postId) {
                item = this.topPosts[index];
            }
            index++;
        } else {
            var changeScore = calcScore(postChange);
            var score = calcScore(this.topPosts[index]);
            //sort by score, DESC
            //then for same score - sort DESC by creation
            if (!found && (changeScore > score
                || (changeScore == score && postChange.creation > this.topPosts[index].creation))) {
                item = postChange;
                found = true;
            } else {
                item = this.topPosts[index];
                index++;
            }
        }

        if (item) {
            newPosts.push(item);
            count++;
        }
    }
    //if new change stil out - push it at the bottom
    if (!found && !isRemoved && count < this.topPostsLimit) {
        newPosts.push(postChange);
    }

    this.topPosts = newPosts;
}

/**
* Clean internal resources
* @returns {undefined} 
*/
Posts.prototype.clean = function () {
    if (!this.connection) {
        return;
    }
    this.connection.close();
    this.connection = undefined;
}

/**
 * Creates a new post
 * @param {String} userId - user owner
 * @param {Post} newPost - new post object
 * @param {function} cb - callback function. function(err, postId:string).
 * @returns {undefined} - new post id, -1 if failed to create.
 */
Posts.prototype.createPost = function (userId, newPost, cb) {
    var post = {
        userId: userId,
        post: newPost,
        downVote: 0,
        upVote: 0,
        creation: Date.now()
    };
    newPost.creation = post.creation;

    r.db(this.dbName).table('posts').insert([post]).run(this.connection, function (err, result) {
        if (err) {
            cb(err);
        } else if (result.inserted !== 1 || result.generated_keys.length !== 1) {
            cb(new Error("Couldn't create post in db"));
        } else {
            cb(undefined, result.generated_keys[0]);
        }
    });
}

/**
 * Updates a post
 * @param {String} userId - user owner
 * @param {String} postId - post Id
 * @param {Post} updatedPost - new post object
 * @param {function} cb - callback function. function(err, result:boolean).
 * @returns {Boolean} - update result
 */
Posts.prototype.updatePost = function (userId, postId, updatedPost, cb) {
    r.db(this.dbName).table('posts').get(postId).update({ post: updatedPost }).
        run(this.connection, function (err, result) {
            if (err) {
                cb(err);
            } else if (result.replaced !== 1) {
                cb(new Error("Couldn't update post in db"));
            } else {
                cb(undefined, true);
            }
        });
}

/**
 * Get an existing post
 * @param {String} postId - post Id
 * @param {function} cb - callback function. function(err, post:ScoredPost).
 * @returns {undefined}
 */
Posts.prototype.getPost = function (postId, cb) {
    r.db(this.dbName)
        .table('posts')
        .get(postId)
        .run(this.connection, function (err, result) {
            if (err) {
                cb(err);
            } else if (!result) {
                cb(new Error("Couldn't get post from db"));
            } else {
                var scoredPost = {
                    post: result.post,
                    upVote: result.upVote,
                    downVote: result.downVote,
                    creation: result.creation
                }
                cb(undefined, scoredPost);
            }
        });
}

/**
 * Vote to post, only once per user.
 * @param {String} userId - user Id
 * @param {String} postId - post Id
 * @param {Boolean} vote - true measn upVote
 * @param {function} cb - callback function. function(err, result:boolean).
 * @returns {undefined}
 */
Posts.prototype.votePost = function (userId, postId, vote, cb) {
    var posts = this;
    var voteObj = {
        user2post: userId + "_2_" + postId,
        vote: vote
    };
    r.db(this.dbName)
        .table('userVotes')
        .insert([voteObj], { conflict: "error" })
        .run(this.connection, function (err, result) {
            if (err) {
                cb(err);
            } else if (result.inserted !== 1) {
                cb(new Error("Couldn't vote on post"));
            } else {
                if (vote) {
                    r.db(posts.dbName)
                        .table('posts')
                        .get(postId)
                        .update({
                            upVote: r.row("upVote").add(1).default(0)
                        })
                        .run(posts.connection, function (err, result) {
                            if (err) {
                                cb(err);
                            } else if (result.replaced !== 1) {
                                cb(new Error("Couldn't update post's upVote in db"));
                            } else {
                                cb(undefined, true);
                            }
                        });
                } else {
                    r.db(posts.dbName)
                        .table('posts')
                        .get(postId)
                        .update({
                            "downVote": r.row("downVote").add(1).default(0)
                        })
                        .run(posts.connection, function (err, result) {
                            if (err) {
                                cb(err);
                            } else if (result.replaced !== 1) {
                                cb(new Error("Couldn't update post's downVote in db"));
                            } else {
                                cb(undefined, true);
                            }
                        });
                }
            }
        });
}

/**
 * Gets list of last created "Top Posts", order by DESC
 * @param {function} cb - callback function. function(posts:Array<ScoredPost>).
 * @returns {undefined}
 */
Posts.prototype.getTopPosts = function (cb) {
    cb(undefined, this.topPosts || []);
}

/**
 * Gets list of last created "Top Posts", order by DESC
 * @param {Number?} total - Number of top Posts to return (Default 5)
 * @param {function} cb - callback function. function(err, change, isRemoved).
 * @returns {undefined}
 */
Posts.prototype.listen2TopPosts = function (total, cb) {
    var posts = this;
    r.db(this.dbName)
        .table('posts')
        .changes()
        .run(posts.connection, function (err, cursor) {
            if (err) {
                cb(err);
            } else if (!posts.connection) {
                //ignore event when closed.
            } else {
                cursor.each(function (error, item) {
                    //ignore 
                    if (error || !posts.connection) {
                        return;
                    }
                    cb(undefined, item.new_val, item.old_val && !item.new_val);
                });
            }
        });
}

module.exports = Posts;