"use strict";

var posts = [];
var postID = 1;

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
* @private
* Search for post
* @param {String} userId - user owner
* @returns {Post|undefined} - exist post, if any.
*/
function _getPost(postId) {
    for (var i = 0; i < posts.length; i++) {
        if (posts[i].postId == postId) {
            return posts[i];
        }
    }

    return undefined;
}

function _sortDownPosts(postArr, cb) {
    var currentIndex, temp;
    var len = postArr.length;

    for (var i = 0; i < len; i++) {
        currentIndex = i;
        for (var j = i + 1; j < len; j++) {
            if (cb(postArr[j], postArr[currentIndex]) > 0) {
                currentIndex = j;
            }
        }
        temp = postArr[i];
        postArr[i] = postArr[currentIndex];
        postArr[currentIndex] = temp;
    }
}

/**
 * Creates a new post
 * @param {String} userId - user owner
 * @param {Post} post - new post object
 * @returns {Number} - new post id, -1 if failed to create.
 */
function createPost(userId, post) {
    var post = {
        userId: userId,
        postId: (postID++).toString(),
        post: post,
        score: 0,
        creation: Date.now(),
        votes: []
    };

    posts.push(post);
    return post.postId;
}

/**
 * Updates a post
 * @param {String} userId - user owner
 * @param {String} postId - post Id
 * @param {Post} post - new post object
 * @returns {Boolean} - update result
 */
function updatePost(userId, postId, post) {
    var post = _getPost(postId);
    if (!post || post.userId !== userId) {
        return undefined;
    }

    post.post = post;
}

/**
 * Get an existing post
 * @param {String} postId - post Id
 * @returns {Post|undefined} - exists Post, if any
 */
function getPost(postId) {
    var post = _getPost(postId);
    return post !== undefined ? post.post : undefined;
}

/**
 * Vote to post, only once per user.
 * @param {String} userId - user Id
 * @param {String} postId - post Id
 * @param {Number} score - score to be added to post.
 * can be negative
 * @returns {Boolean} - vote result. False if already voted by this user
 */
function votePost(userId, postId, score) {
    var post = _getPost(postId);
    if (!post) {
        return false;
    }

    //search if user already voted
    for (var i = 0; i < post.votes.length; i++) {
        if (post.votes[i].userId === userId) {
            //already voted
            return false;
        }
    }

    post.votes.push({ userId: userId, score });
    post.score += score;
    return true;
}

/**
 * Gets Top Posts list, order from high-to-low
 * @param {Number?} total - Number of top Posts to return (Default 5)
 * @returns {Array<ScoredPost>} - list of last created "Top Posts", order by DESC
 */
function getTopPosts(total) {
    total = total || 5;
    //sort posts by creation time.
    _sortDownPosts(posts, function (p1, p2) {
        if (p1.creation < p2.creation) {
            return -1;
        }
        if (p1.creation === p2.creation) {
            return 0;
        }
        return 1;
    });

    var topPosts = Math.min(posts.length, total);
    var _topPosts = posts.slice(0, topPosts);
    //sort posts by creation time.
    _sortDownPosts(_topPosts, function (p1, p2) {
        if (p1.score < p2.score) {
            return -1;
        }
        if (p1.score === p2.score) {
            return 0;
        }
        return 1;
    });

    //prepare response
    var _posts = [];
    for (var i = 0; i < topPosts; i++) {
        var post = _topPosts[i];
        _posts.push({
            postId: post.postId,
            post: post.post,
            score: post.score,
            creation: post.creation
        });
    }
    return _posts;
}

module.exports = {
    createPost: createPost,
    updatePost: updatePost,
    getPost: getPost,
    votePost: votePost,
    getTopPosts: getTopPosts,
}