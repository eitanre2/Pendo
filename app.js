"use strict";

var express = require('express');
var config = require('./config/default.json');

//creatd express app
var app = express();

// Routers

// Test
app.get('/Test', function (req, res) {
  res.send('Hello World');
});

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
