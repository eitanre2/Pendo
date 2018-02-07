"use strict";

/**
 * @typedef Post
 * @property {string} title - post's title
 * @property {string} body - post's body
 */

/**
* @typedef ScoredPost
* @property {Post} post - post
* @property {Number} score - post's current score
*/

/**
 * @constructor
 * @param {number?} topPostsLimit - limit of top posts
 */
function PostsDummy(topPostsLimit) {
    this.posts = [];
    this.postID = 1;
    /**@member {number} topPostsLimit number of top posts to get */
    this.topPostsLimit = topPostsLimit || 5;
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
PostsDummy.prototype.init = function (cb) {
    cb();
}

/**
* Clean internal resources
* @returns {undefined}
*/
PostsDummy.prototype.clean = function () {
}
/**
* @private
* Search for post
* @param {String} userId - user owner
* @returns {Post|undefined} - exist post, if any.
*/
PostsDummy.prototype._getPost = function (postId) {
    for (var i = 0; i < this.posts.length; i++) {
        if (this.posts[i].postId == postId) {
            return this.posts[i];
        }
    }

    return undefined;
}

/**
 * Creates a new post
 * @param {String} userId - user owner
 * @param {Post} newPost - new post object
 * @param {function} cb - callback function. function(err, postId:string).
 * @returns {undefined} - new post id, -1 if failed to create.
 */
PostsDummy.prototype.createPost = function (userId, newPost, cb) {
    var post = {
        userId: userId,
        postId: (this.postID++).toString(),
        post: newPost,
        score: 0,
        creation: Date.now(),
        votes: []
    };
    newPost.creation = post.creation;

    this.posts.push(post);
    cb(undefined, post.postId);
}

/**
 * Updates a post
 * @param {String} userId - user owner
 * @param {String} postId - post Id
 * @param {Post} updatedPost - new post object
 * @param {function} cb - callback function. function(err, result:boolean).
 * @returns {Boolean} - update result
 */
PostsDummy.prototype.updatePost = function (userId, postId, updatedPost, cb) {
    var post = this._getPost(postId);
    if (!post || post.userId !== userId) {
        return undefined;
    }

    post.post = updatedPost;
    cb(undefined, true);
}

/**
 * Get an existing post
 * @param {String} postId - post Id
 * @param {function} cb - callback function. function(err, post:ScoredPost).
 * @returns {undefined}
 */
PostsDummy.prototype.getPost = function (postId, cb) {
    var post = this._getPost(postId);
    if (!post) {
        cb(new Error("Couldn't get post"));
    } else {
        var scoredPost = {
            score: post.score,
            post: post.post
        };
        cb(undefined, scoredPost);
    }
}

/**
 * Vote to post, only once per user.
 * @param {String} userId - user Id
 * @param {String} postId - post Id
 * @param {Number} score - score to be added to post.
 * can be negative
 * @param {function} cb - callback function. function(err, result:boolean).
 * @returns {undefined}
 */
PostsDummy.prototype.votePost = function (userId, postId, score, cb) {
    var post = this._getPost(postId);
    if (!post) {
        cb(new Error("Couldn't get post"), false);
        return;
    }

    //search if user already voted
    for (var i = 0; i < post.votes.length; i++) {
        if (post.votes[i].userId === userId) {
            //already voted
            cb(new Error("Already voted"), false);
            return;
        }
    }

    post.votes.push({ userId: userId, score });
    post.score += score;
    cb(undefined, true);
}

/**
 * Gets list of last created "Top Posts", order by DESC
 * @param {function} cb - callback function. function(err, posts:Array<ScoredPost>).
 * @returns {undefined}
 */
PostsDummy.prototype.getTopPosts = function (cb) {
    //sort posts by creation time.
    var pastHotline = Date.now() - this.hotPostsPeriod;

    this.posts.sort(function (a, b) {
        if (a.creation < pastHotline) {
            return -1;
        }
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

    var _posts = this.posts.slice(0, Math.min(this.posts.length, this.topPostsLimit));
    cb(undefined, _posts);
}

module.exports = PostsDummy;