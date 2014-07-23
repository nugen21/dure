
/**
 * Module dependencies.
 */

var express = require('express')
	, http = require('http')
	, path = require('path')
	, routes = require('./routes')
	, user = require('./routes/user')
	
	, everyauth = require('everyauth')
	, conf = require('./conf')
	, socketio = require('socket.io');

everyauth.debug = true;

var app = express();

var usersById = {};
var nextUserId = 0;

var usersByfbId = {};

function addUser(source, sourceUser) {
	var user;
	
	if(arguments.length == 1) {
		user = sourceUser = source;
		user.id = ++nextUserid;
		return usersById[nextUserId] = user;
	} else {
		user = usersById[++nextUserId] = {id: nextUserId};
		user[source] = sourceUser;
	}
	return user;
}

//인증받지 않은 상태로 접속할 경우 인증을 받도록 리다이렉션 함.
var check_auth = function(req, res, next) {
	if(!req.loggedIn) {
		res.redirect('/auth/facebook');
	}
	next();
};

everyauth.everymodule.findUserById(function(id, callback) {
	callback(null, usersById[id]);
});

everyauth.facebook
	.entryPath('/auth/facebook')
	.callbackPath('/auth/facebook/callback')
	.appId(conf.fb.appId)
	.appSecret(conf.fb.appSecret)
	.scope('email, user_location, user_photos')
	.fields('id, name, email, picture')
	.handleAuthCallbackError(function(req, res) {
		
	})
	.findOrCreateUser(function(session, accessToken, accessTokenExtra, fbUserMetadata) {
		return usersByfbId[fbUserMetadata.id] || (usersByfbId[fbUserMetadata.id] = addUser('facebook', fbUserMetadata));
	}).redirectPath('/');

// all environments
app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.cookieParser('myKey'));
	app.use(express.session({secret: 'asdfg'}));
	app.use(everyauth.middleware(app));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development' , function() {
	app.use(express.errorHandler({dumpExeption: true, showStack: true}));
});

app.get('/', check_auth, routes.index);
app.get('/users', check_auth, user.list);
app.get('/load', check_auth, routes.load);

app.post('/write', check_auth, routes.write);
app.post('/like', check_auth, routes.like);
app.post('/unlike', check_auth, routes.unlike);
app.post('/comment', check_auth, routes.comment);
app.post('/del', check_auth, routes.del);
app.post('/modify', check_auth, routes.modify);

http.createServer(app).listen(app.get('port'), function(req, res){
  console.log('Express server listening on port ' + app.get('port'));
});
