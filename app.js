var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var zendesk = require('node-zendesk'),
    fs      = require('fs');
var request = require('request');
require('recordit-url-builder');
var app = express();
var passport = require('passport');
var ZendeskStrategy = require('passport-zendesk').Strategy;
var root = 'https://zen-recordit.herokuapp.com/login/callback'; // 'https://zen-recordit.herokuapp.com/login/callback' TODO this should be a session variable

// configure express
app.use(cookieParser());
app.use(bodyParser.json({ type: 'application/x-www-form-urlencoded' }));
app.use(session({ secret: 'hushhush', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// configure passport
passport.use(new ZendeskStrategy({
    subdomain: 'itjoe',
    clientID: 'recordit_integration',
    clientSecret: 'd9ba3d580b752fd4b9a8549fc7450f55fc36c025da3b7d15e14cd3c6e70522d2',
    callbackURL: root+ '/login/callback'
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

// configure recordit url builder TODO: get this from a session variable for security
var urlBuilder = new Recordit.URLBuilder({
  clientID : "550769da0787b8fe768d084801bac17399913a8b",
  secret : "b276bc51c25b26d411170cf8508e83fcdfaa572f"
});

// #### ROUTES ####
app.get('/login', passport.authenticate('zendesk'));  // pass subdomain as URL parameter e.g. ?subdomain=itjoe

app.get('/login/callback', passport.authenticate('zendesk', { failureRedirect: '/login' }),
  function(req, res) {
    // successful authentication
    // create user & account, store token
    console.log(req.user);
    var token = req.authInfo,
        subdomain = 'itjoe';

    var notification = {
      "app_id": 0,
      "event": "loginDone",
      "body": {
        "token": token
      },
      "agent_id": req.user.id
    };
    sendNotification(notification, subdomain, token);
    res.send("all good");
    // redirect home
    // res.redirect('/success');
  });

// on recordit URI request
app.get('/recordituri', function(req, res){
  // check 1. if account exists, 2. if user exists, 3. that user can auth into ticket
  var user = {
        email: req.query.user_email,
        id: req.query.user_id
      },
      ticket_id = req.query.ticket_id,
      subdomain = req.query.subdomain,
      token = req.query.token;


  var client = zendesk.createClient({
      username:  user.email,
      token:     token,
      remoteUri: 'https://' + subdomain + '.zendesk.com/api/v2',
      oauth: true
  });
    // check that the token is valid
  client.users.auth(function (err, authRequest, result) {
    if (err) {
      console.log(err);
      // TODO: send the correct response code?
      res.redirect('/login?subdomain=' + subdomain); // TODO probably need to do this redirect in the client app given a JSON response
      return; // shut it down
    }
    // console.log(JSON.stringify(result.verified));

    // if so -> continue to create and return URI
    console.log('User authenticated into Zendesk');

    var role = req.query.role,
      uri;

    if (role == 'agent') {
      // build the URI
      uri = urlBuilder.generate({
        fps : 12,
        encode : "all",
        callback : root+ "/recordit/completed?ticket_id=" +ticket_id+ "&subdomain=" +subdomain+ "user_id=" +user.id+ "&role=agent&token=" + token, // add dynamic parameters (account, user, ticket)
        start_message : "Let's get it started",
        end_message : "Sending to Zendesk, recording should be available shortly"
      });
    } else {
      uri = urlBuilder.generate({
        fps : 12,
        encode : "all",
        callback : root+ "/recordit/completed?ticket_id=" + ticket_id, // add dynamic parameters (account, user, ticket)
        start_message : "Please record the problem",
        end_message : "Sending to Zendesk, recording should be available shortly"
        // action_url : "https://" + subdomain + ".zendesk.com/agent/#/tickets/" + ticket_id
        // fps : fps,
        // encode : encode,
        // action_url : action_url,
        // callback : callback,
        // start_message : start_message,
        // end_message : end_message,
        // width : width,
        // height : height
      });
    }
    
    // respond w/ URI
    var response = {
      uri: uri
    };
    res.send(response);


  });

});

// on recordit callback
app.post('/recordit/completed', function(req, res) {
  // if the status is 'ready'

  if(req.body.status == 'ready') {

    console.dir(req.body);

    // grab the details, fetch the GIF, upload it, and update the ticket
    var user = {
      email: req.query.user,
      id: req.query.user_id
    },
    ticket_id = req.query.ticket_id || '10',
    subdomain = req.query.subdomain,
    token = req.query.token;


    var client = zendesk.createClient({
      token:     token,
      remoteUri: 'https://' +subdomain+ '.zendesk.com/api/v2',
      oauth: true
    });

    // TODO: grab the file, upload the file, grab the uploads token



    // client.attachments.upload( theImage , null, function(err, req, result) {
    //   if (err) {
    //     console.log(err);
    //     return;
    //   }
    //   console.dir(result[0]);
    // });
    
    // IF it is an end-user -> update the ticket with the screenshot
    // var ticket = {"ticket":{
    //     "comment": { "body": "The smoke is very colorful, and this shit works!"}
    //   }
    // };
    // client.tickets.update(ticket_id, ticket,  function(err, req, result) {
    //   if (err) return handleError(err);
    //   console.log("successfully updated the ticket!");
    //   // successfully updated the ticket!
    //   res.send("all good");
    // });

    // ELSE if role is agent -> send them the screenshot via app notifications


    var notification = {
      "app_id": 0,
      "event": "screencastDone",
      "body": {
        "ticketID": ticket_id,
        "gifURL": req.body.gifURL,
        "recorditURL": req.body.recorditURL
      },
      "agent_id": user.id
    };
    // sendNotification(notification, subdomain, token);
    // res.send("all good");
    // NOTE this was abstracted to 'sendNotification'
    var options = {
      uri: 'https://' +subdomain+ '.zendesk.com/api/v2/apps/notify.json',
      method: 'POST',
      json: notification,
      auth: {bearer: token}
    };
    request.post(options, function optionalCallback (err, httpResponse, body) {
      if (err) {
        return console.error('Notifications POST failed:', err);
      }
      res.send("all good");
      console.log('POST to notifications successful!  Server responded with:', body);
    });

  } else {
    // status is not ready
    res.send("all good, image isn't ready yet");
    console.dir(req.body);
  }
  
});

// named functions
function handleError(err) {
  console.log(err);
  process.exit(-1);
}

function sendNotification(notification, subdomain, token) {
  var options = {
    uri: 'https://' +subdomain+ '.zendesk.com/api/v2/apps/notify.json',
    method: 'POST',
    json: notification,
    auth: {bearer: token}
  };
  request.post(options, function optionalCallback (err, httpResponse, body) {
    if (err) {
      return console.error('Notifications POST failed:', err);
    }
    console.log('POST to notifications successful!');
    console.log(notification);

  });
}

// START
app.listen(process.env.PORT || 3000);

