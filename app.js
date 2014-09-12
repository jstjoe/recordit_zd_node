var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var zendesk = require('node-zendesk'),
    fs      = require('fs');

var app = express();
var passport = require('passport');
var ZendeskStrategy = require('passport-zendesk').Strategy;
require('recordit-url-builder');

// configure express
app.use(cookieParser());
app.use(session({ secret: 'hushhush', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// configure passport
passport.use(new ZendeskStrategy({
    subdomain: 'itjoe',
    clientID: 'recordit_integration',
    clientSecret: 'd9ba3d580b752fd4b9a8549fc7450f55fc36c025da3b7d15e14cd3c6e70522d2',
    callbackURL: 'http://localhost:3000/login/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile, accessToken);
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

// ROUTES
app.get('/login', passport.authenticate('zendesk'));  // , { subdomain: subdomain }

app.get('/login/callback', passport.authenticate('zendesk', { failureRedirect: '/login', subdomain: 'itjoe' }),
  function(req, res) {
    // successful authentication
    // create user & account, store token
    console.log(req.authInfo);

    // redirect home
    res.redirect('/success');
  });

// on recordit URI request
app.get('/recordituri', function(req, res){
  // check 1. if account exists, 2. if user exists, 3. that user can auth into ticket
  var user = req.query.user,
    account = req.query.account,
    ticket_id = req.query.ticket;
    // check for user & account in DB, if found grab the token and then...
  var client = zendesk.createClient({
    username:  'username',
    token:     'oauth_token',
    remoteUri: 'https://itjoe.zendesk.com/api/v2',
    oauth: true
  });
    // check that the user is authenticated
  client.users.auth(function (err, req, result) {
    if (err) {
      console.log(err);
      res.redirect('/login');
      return;
    }
    // console.log(JSON.stringify(result.verified, null, 2, true));

    // if so -> continue to create and return URI
    console.log('User authenticated into Zendesk');




  });
    

    

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
    fps : 12,
    encode : "gif",
    action_url : "http://requestb.in/1ct4lea1?inspect",
    callback : "http://requestb.in/1ct4lea1", // add dynamic parameters (account, user, ticket)
    start_message : "Record the problem please :)",
    end_message : "Problem recorded!",
    width : 1280,
    height : 720
    // fps : fps,
    // encode : encode,
    // action_url : action_url,
    // callback : callback,
    // start_message : start_message,
    // end_message : end_message,
    // width : width,
    // height : height
  });
  // respond w/ URI
  var response = {
    uri: uri
  };
  res.send(response);
});

// on recordit callback
app.post('/completed', function(req, res) {
  console.log(req);
  // grab the details, fetch the GIF, upload it, and update the ticket
  var user = req.query.user,
    account = req.query.account,
    ticket_id = req.query.ticket;

  var client = zendesk.createClient({
    username:  'username',
    token:     'oauth_token',
    remoteUri: 'https://itjoe.zendesk.com/api/v2',
    oauth: true
  });

  // TODO: upload the file, grab the uploads token
  // client.attachments.upload(file, fileToken, cb);

  var ticket = {"ticket":{
      "comment": { "body": "The smoke is very colorful."}
    }
  };

  client.tickets.update(ticket_id, ticket,  function(err, req, result) {
    if (err) return handleError(err);
    console.log(JSON.stringify(result, null, 2, true));
    // successfully updated the ticket!
  });



});


// named functions
function handleError(err) {
    console.log(err);
    process.exit(-1);
}

// START
app.listen(3000);

