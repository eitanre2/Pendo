"use strict";

var express = require('express');
var router = express.Router();

var postsModel = require('../models/posts');
var postsCtl = new postsModel();
postsCtl.init();

var config = {
  topPost: 5
};

function setconfig(configObj) {
  config = configObj || config;
}

// Create new post
router.put('/', function (req, res) {
  if (!req.body.title || !req.body.body) {
    res.sendStatus(400);
    return;
  }
  var post = {
    title: req.body.title,
    body: req.body.body
  };
  postsCtl.createPost(req.identity.userId, post, function (err, postId) {
    res.json({
      result: postId >= 0,
      postId: postId
    });
  });
});

//update new post
router.post('/:postId', function (req, res) {
  if (!req.body.title || !req.body.body) {
    res.sendStatus(400);
    return;
  }
  var userId = req.identity.userId;
  var postId = req.params.postId;
  var post = {
    title: req.body.title,
    body: req.body.body
  };
  postsCtl.updatePost(req.identity.userId, postId, post, function (err, result) {
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

});

//get "Top Posts"
router.get('/top', function (req, res) {
  postsCtl.getTopPosts(function (err, topPosts) {
    res.setHeader('Cache-Control', 'public, max-age=2');
    res.json({
      topPosts: topPosts,
      result: topPosts && topPosts.length > 0
    });
  });

});

//get a post
router.post('/:postId', function (req, res) {
  var postId = req.params.postId;
  postsCtl.getPost(postId, function (err, post) {
    res.json({
      result: post !== undefined,
      postId: postId,
      post: post
    });
  });
});

//upvote a post
router.post('/:postId/up', function (req, res) {
  var userId = req.identity.userId;
  var postId = req.params.postId;
  postsCtl.votePost(userId, postId, true, function (err, result) {
    res.json({
      result: result
    });
  });
});

//downvote a post
router.post('/:postId/down', function (req, res) {
  var userId = req.identity.userId;
  var postId = req.params.postId;
  postsCtl.votePost(userId, postId, false, function (err, result) {
    res.json({
      result: result
    });
  });
});

module.exports = {
  router: router,
  setconfig: setconfig
};
