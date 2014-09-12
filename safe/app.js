var express = require('express');
var app = express();
var Recordit = require('recordit-url-builder');


var urlBuilder = new Recordit.URLBuilder({
    clientID : "f33dd06d1cd1fb6e94504c767e5ccd9d0f7cd039",
    secret : "6d85ffe45dbc37f6e47bc443f6079dc26f61b3df"
});


// routes
app.get('/recordituri', function(req, res){
  // parse query string parameters into variables
  var fps = req.query.fps,
    encode = req.query.encode,
    action_url = req.query.action_url,
    callback = req.query.callback,
    start_message = req.query.start_message,
    end_message = req.query.end_message,
    width = req.query.width,
    height = req.query.height;

  // build the URI
  var uri = urlBuilder.generate({
      fps : fps,
      encode : encode,
      action_url : action_url,
      callback : callback,
      start_message : start_message,
      end_message : end_message,
      width : width,
      height : height
  });

  // define response JSON
  var response = {
    uri: uri
  };

  // respond
  res.send(response);
});

app.post('/completed', function(req, res) {
  console.log(req);

});