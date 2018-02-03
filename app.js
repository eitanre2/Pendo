"use strict";

var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config/default.json');

//creatd express app
var app = express();

// Test
app.get('/Test', function (req, res) {
  res.send('Hello World');
});

//TODO: implement identity mechanism jwt, Authorization: Bearer
app.use(function (req, res, next) {
  var authHeader = req.headers["authorization"];
  var userId = authHeader;

  if (userId === undefined) {
    res.status(403).json({
      message: "Access Denied!"
    });
    return;
  }

  req.identity = {
    userId: userId
  };
  next();
})


app.use(bodyParser.json());
var posts = require('./routes/posts');
posts.setconfig(config.posts);

// Routers
app.use("/posts", posts.router);

// Error Handling
app.use(function (err, req, res, next) {
  console.log(JSON.stringify(err));
  console.log("EXCEPTION :: " + err.message);
  console.log(err.stack);
  res.status(500).json({
    message: err.message,
    stack: err.stack
  });
})

console.log("Start listening on port " + config.port);
app.listen(config.port);
