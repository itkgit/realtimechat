var	express = require('express')
,	http = require('http')
,	redis = require('redis');

var app = express.createServer();
var io = require('socket.io').listen(app);
var redisClient = redis.createClient();

//public router
app.use(express.static(__dirname + '/public'));


app.get("/",function(req,res) {
	res.render('index.ejs',{now:new Date()});
});

app.listen(8080);

var messages =[];
var storeMessages = function(name,data) {
	var message = JSON.stringify({name:name,data:data});
	
	redisClient.lpush('messages',message,function(err,response) {
		redisClient.ltrim('messages',0,10);
	});
	
}

io.sockets.on('connection',function(client) {
	client.on('join',function(name) {
		client.set('nickname',name);
		
		io.sockets.emit('add chatter',name);
		redisClient.smembers('chatters',function(err,chatters) {
			chatters.forEach(function(name) {
				client.emit('add chatter',name);
			});			
		});

		redisClient.sadd('chatters',name);
		
		redisClient.lrange('messages',0,-1,function(err,messages) {
			var messages = messages.reverse();
			messages.forEach(function(message) {
				var message = JSON.parse(message);
				client.emit('chat',{name:message.name,data:message.data})
			})
		})
	})
	client.on('messages',function(data) {
		client.get('nickname',function(err,name) {
			storeMessages(name,data);
			io.sockets.emit('chat',{name:name,data:data});
		});
	});
	
	client.on('disconnect',function(name) {
		client.get('nickname',function(err,name) {
			client.broadcast.emit('remove chatter',name);
			redisClient.srem('chatters',name);
		})
	})
});
