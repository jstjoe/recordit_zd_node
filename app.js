var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var zendesk = require('node-zendesk'),
    fs      = require('fs');

require('recordit-url-builder');


var app = express();
var passport = require('passport');
var ZendeskStrategy = require('passport-zendesk').Strategy;

// configure express
app.use(cookieParser());
app.use(bodyParser.raw());
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

// configure recordit url builder
var urlBuilder = new Recordit.URLBuilder({
    clientID : "550769da0787b8fe768d084801bac17399913a8b",
    secret : "b276bc51c25b26d411170cf8508e83fcdfaa572f"
});

// ROUTES
app.get('/login', passport.authenticate('zendesk'));  // , { subdomain: subdomain }

app.get('/login/callback', passport.authenticate('zendesk', { failureRedirect: '/login', subdomain: 'itjoe' }),
  function(req, res) {
    // successful authentication
    // create user & account, store token
    // console.log(req.authInfo);

    // redirect home
    res.redirect('/success');
  });

// on recordit URI request
app.get('/recordituri', function(req, res){
  // check 1. if account exists, 2. if user exists, 3. that user can auth into ticket
  var user = req.query.user,
    account = req.query.account,
    ticket_id = req.query.ticket_id;
    // check for user & account in DB, if found grab the token and then...
  var client = zendesk.createClient({
    username:  'joe+it@zendesk.com',
    token:     '6ad6642776b614c0d7aa76dd7aab4f0d3d44d4fa41fd1234c181380e43ebeaea',
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
    callback : "http://pacific-wildwood-4341.herokuapp.com/recordit/completed", // add dynamic parameters (account, user, ticket)
    start_message : "Record the problem please",
    end_message : "Problem recorded",
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
app.post('/recordit/completed', function(req, res) {
  console.log(req.body);

  // var data = req.body.replace('\\', '');
  // console.log(data);
  // grab the details, fetch the GIF, upload it, and update the ticket
  var user = req.query.user,
    account = req.query.account,
    ticket_id = req.query.ticket || '10';

  var client = zendesk.createClient({
    username:  'joe+it@zendesk.com',
    token:     '6ad6642776b614c0d7aa76dd7aab4f0d3d44d4fa41fd1234c181380e43ebeaea',
    remoteUri: 'https://itjoe.zendesk.com/api/v2',
    oauth: true
  });

  // TODO: upload the file, grab the uploads token
  // client.attachments.upload(file, fileToken, cb);

  var ticket = {"ticket":{
      "comment": { "body": "The smoke is very colorful, and this shit works!"}
    }
  };

  client.tickets.update(ticket_id, ticket,  function(err, req, result) {
    if (err) return handleError(err);
    console.log("successfully updated the ticket!");
    // successfully updated the ticket!
    res.send("all good");
  });



});


// named functions
function handleError(err) {
    console.log(err);
    process.exit(-1);
}

// START
app.listen(process.env.PORT || 3000);

