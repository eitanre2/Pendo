"use strict";

var express = require('express');
var router = express.Router();

var postsCtl = require('../controllers/posts_dummy');


// Create new post
router.put('/', function (req, res) {
  var post = {
    title: req.body.title,
    body: req.body.body
  };
  var postId = postsCtl.createPost(req.identity.userId, post);

  res.json({
    result: postId >= 0,
    postId: postId
  });
});

//update new post
router.post('/:postId', function (req, res) {
  var userId = req.identity.userId;
  var postId = req.params.postId;
  var post = {
    title: req.body.title,
    body: req.body.body
  };
  var result = postsCtl.updatePost(req.identity.userId, postId, post);
  if (result) {
    res.json({
      result: true
    });
  } else {
    res.status(405).json({
      result: false,
      message: "Failed to update post"
    });
  }
});

//get "Top Posts"
router.get('/top', function (req, res) {
  var topPosts = postsCtl.getTopPosts();
  res.json({
    topPosts: topPosts,
    result: topPosts && topPosts.length > 0
  });
});

//get a post
router.get('/:postId', function (req, res) {
  var postId = req.params.postId;
  var post = postsCtl.getPost(postId);
  res.json({
    result: post !== undefined,
    postId: postId,
    post: post
  });
});

//upvote a post
router.get('/:postId/up', function (req, res) {
  var userId = req.identity.userId;
  var postId = req.params.postId;
  var result = postsCtl.votePost(userId, postId, 1);

  res.json({
    result: result
  });
});

//downvote a post
router.get('/:postId/down', function (req, res) {
  var userId = req.identity.userId;
  var postId = req.params.postId;
  var result = postsCtl.votePost(userId, postId, -1);

  res.json({
    result: result
  });

});

module.exports = {
  router: router,
  setconfig: setconfig
};
