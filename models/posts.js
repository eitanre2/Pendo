"use strict";
var r = require('rethinkdb');

const POST_TABLE = "posts"
const USER_VOTES_TABLE = "userVotes"

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
        //first get current TopPosts
        posts.currentTopPosts(function (err) {
            if (err) {
                cb && cb(err);
                return;
            }
            //then, listen..
            posts.listen2TopPosts(function (err, change, isRemoved) {
                if (err) {
                    cb && cb(err);
                    return;
                }
                change.postId = change.id;
                posts.handlePostUpdate(change, isRemoved);
            });
            cb && cb(err);
        });
    })
}
/**
 * Calc final post post weight.
 * @param {object} post 
 */
function calcScore(post) {
    return post.upVote - post.downVote;
}

/**
 * Handle updates in posts table. Store TopPosts list for future calls
 * @param {object} postChange  - the new version of post
 * @param {boolean} isRemoved - determines a removed post
 */
Posts.prototype.handlePostUpdate = function (postChange, isRemoved) {
    var len = this.topPosts.length;
    var pastHotline = Date.now() - this.hotPostsPeriod;
    //updates on old post will be treat will be ignored
    isRemoved = isRemoved || postChange.creation < pastHotline;
    var found = false;
    var count = 0;
    //new copy of posts list
    var newPosts = [];
    var index = 0;
    var changeScore = calcScore(postChange);
    var item;
    /**
     * Loop description:
     * For every update we will go over the local list and 
     * A - remove old posts (before the hotPostsPeriod) 
     * B - place the postChange object, if not removed
     * C - place again all exist posts from original list 
     */
    while (index < len && count < this.topPostsLimit) {
        //ignore this item in local list (to allow re-order)
        //(A) ignore too old posts in local list
        if (this.topPosts[index].postId === postChange.postId
            || this.topPosts[index].creation < pastHotline) {
            index++;
            continue;
        }

        if (isRemoved) {
            //(A) ignore this item if removed
            if (this.topPosts[index].postId !== postChange.postId) {
                item = this.topPosts[index];
            }
            index++;
        }
        else {
            var score = calcScore(this.topPosts[index]);
            //check if current index good for this update
            //sort by score (DESC) and then by creation (DESC)
            if (!found && (changeScore > score
                //(B) put the change here, to keep the list ordered
                || (changeScore == score && postChange.creation > this.topPosts[index].creation))) {
                item = postChange;
                found = true;
            } else {
                //(C) - put back original posts.
                item = this.topPosts[index];
                index++;
            }
        }
        if (item) {
            newPosts.push(item);
            count++;
        }
    }
    //(B) if new change still out - push it at the bottom
    if (!found && !isRemoved && newPosts.length < this.topPostsLimit) {
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
        score: 0,
        upVote: 0,
        creation: Date.now()
    };
    newPost.creation = post.creation;

    r.db(this.dbName).table(POST_TABLE).insert([post]).run(this.connection, function (err, result) {
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
    r.db(this.dbName).table(POST_TABLE).get(postId).update({ post: updatedPost }).
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
        .table(POST_TABLE)
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
        .table(USER_VOTES_TABLE)
        .insert([voteObj], { conflict: "error" })
        .run(this.connection, function (err, result) {
            if (err) {
                cb(err);
            } else if (result.inserted !== 1) {
                cb(new Error("Couldn't vote on post"));
            } else {
                r.db(posts.dbName)
                    .table(POST_TABLE)
                    .get(postId)
                    .update({
                        upVote: r.row("upVote").add(vote ? 1 : 0).default(0),
                        downVote: r.row("downVote").add(vote ? 0 : 1).default(0),
                        score: r.row("score").add(vote ? 1 : -1)
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
 * @param {function} cb - callback function. function(err, change, isRemoved).
 * @returns {undefined}
 */
Posts.prototype.listen2TopPosts = function (cb) {
    var posts = this;
    var pastHotline = Date.now() - this.hotPostsPeriod;

    r.db(this.dbName)
        .table(POST_TABLE)
        .changes({ includeTypes: true })//, includeInitial: true })
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
                    cb(undefined, item.new_val, item.type === "remove");
                });
            }
        });
}

/**
 * Gets the current "Top Posts" (DESC by score, last)
 * @param {function} cb - callback function. function(err, change, isRemoved).
 * @returns {undefined}
 */
Posts.prototype.currentTopPosts = function (cb) {
    var posts = this;
    var pastHotline = Date.now() - this.hotPostsPeriod;

    r.db(this.dbName)
        .table(POST_TABLE)
        .orderBy({ index: r.desc('score') })
        .filter(r.row("creation").gt(pastHotline))
        .limit(this.topPostsLimit)
        .run(posts.connection, function (err, cursor) {
            if (err) {
                cb(err);
            } else {
                cursor.toArray(function (err, result) {
                    if (err) {
                        cb(err);
                    } else {
                        posts.topPosts = result;
                        cb();
                    }
                });
            }
        });
}

module.exports = Posts;