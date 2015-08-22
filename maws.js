
// Copyright 2015  Sleepless Software Inc.  All Rights Reserved



MAWS = {
	dbg: function() {},
};


(function() {

	var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }
	var o2j = function(o) { try { return JSON.stringify(o) } catch(e) { return null } }
	var time = function() { return Math.floor(new Date().getTime() / 1000) }
	var D = function(s) { MAWS.dbg(s) }

	var seq = 0;

	var WaitList = function() {

		var timer = null
		var wraps = {}
		var num = 0

		// remove a msg from the waiting list
		var rem = this.rem = function(id) {
			var p = null
			var w = wraps[id]
			if(w) {
				p = w.payload
				delete wraps[id]
				num -= 1
				if(num == 0) {
					D("clearInterval "+timer)
					clearInterval(timer)
					timer = null
				}
				D("removed "+id+" "+o2j(p));
			}
			return p
		}

		// put a msg into the waiting list
		// ttl is in secs and should not be less than 10
		var ins = this.ins = function(p, id, ttl) {
			D("inserting "+id+" "+o2j(p));
			var w = {
				expire: time() + (ttl || 60),
				payload: p,
			}
			wraps[id] = w;
			num += 1
			if(num == 1) {
				timer = setInterval(function() {
					var t = time()
					for(var k in wraps) {
						var w = wraps[k];
						if(t >= w.expire) {
							rem(k);
						}
					}
				}, 10 * 1000);
				D("setInterval "+timer)
			}
		}

	}


	if((typeof process) === 'undefined') {

		// ===========================================================================
		// browser code (client)
		// ===========================================================================

		MAWS.connect = function(cb_msg, cb_ctrl, path) {
			D("connect()")

			cb_msg = cb_msg || function(){}
			cb_ctrl = cb_ctrl || function(){}
			path = path || ""

			var conn = {}

			var waiting = new WaitList()

			var send = conn.send = function(m, cb) {
				D("send "+o2j(m))
				if(m.msg_id === undefined) {
					m.msg_id = "c"+(++seq); // every message must have an id
				}

				// put msg into waiting list if caller is expecting a reply
				if(cb) {
					waiting.ins({msg:m, cb:cb}, m.msg_id)
				}

				D(">>---> "+o2j(m))
				socket.send( o2j(m) ); 	// JSON encode outgoing msg and send it off
			}

			var socket = new WebSocket( "ws://"+document.location.host+"/"+path )

			socket.onerror = function(evt) {
				cb_ctrl("error", evt.data);
			}

			socket.onopen = function() {
				cb_ctrl("connected");
			}

			socket.onmessage = function(evt) {
				D("<---<<"+evt.data)

				var j = evt.data		// raw message is a utf8 string
				var msg_in = j2o(j)
				if(typeof msg_in !== "object") {
					cb_ctrl("error", "unreadable message");
					return;
				}

				if(msg_in.msg) {
					// server initiated msg (not a reply)
					D("initiated")
					msg_in.reply = function(data) {
						send({ msg_id: msg_in.msg_id, response: data, })
					}
					// create an error function.
					msg_in.error = function(err) {
						send({ msg_id: msg_in.msg_id, error: err, response: null, });
					}
					D(" passing msg on "+o2j(msg_in))
					cb_msg(msg_in)
					return;
				}
				
				if(msg_in.response) {
					// response to a client initiated msg
					D("reply to client initiated msg")
					var x = waiting.rem(msg_in.msg_id); 
					if(!x) {
						//cb_ctrl("error", "invalid reply")
						D("no matching msg for reply")
						return;
					}
					// route response to associated call back
					var m = x.msg
					var cb = x.cb;
					if(cb) {
						D(" routing reply "+o2j(msg_in.response))
						cb(msg_in.response);
					}

					return
				}
				
				cb_ctrl("error", "bad message");
			}

			return conn
		}

	}
	else  {

		// ===========================================================================
		// node.js code (server)
		// ===========================================================================

		MAWS.listen = function(port, cb_req, docroot) {
			D(" listen port="+port+" docroot="+docroot)

			// create http server
			httpd = require('http').createServer(function(req, res) {
				var r500 = function(res) { res.writeHead(500); res.end(); }
				if(req.method == "GET") {
					var send = require('send')
					var path = require("url").parse(req.url).pathname
					D("GET "+path);
					send(req, path, {root: docroot || "docroot"}).on("error", function(e) {
						r500(res)
					}).pipe(res);
				}
				else {
					r500(res)
				}
			}).listen(port);

			// setup websockets
			var websocket = require("websocket");
			var wsd = new websocket.server({
				httpServer: httpd,
				autoAcceptConnections: false
			});

			wsd.on("request", function(req) {
				D("incoming connection "+req)
				cb_req(req, function(cb_msg, cb_ctrl) {
					D("accepting connection")

					var conn = {}

					var waiting = new WaitList()

					// sends a msg to client
					var send = conn.send = function(m, cb) {
						D("send "+o2j(m))
						if(m.msg_id === undefined) {
							m.msg_id = "s"+(++seq); // every message must have an id
						}
						// put msg into waiting list if caller is expecting a reply
						if(cb) {
							waiting.ins({msg:m, cb:cb}, m.msg_id)
						}

						D("<---<< "+o2j(m))
						socket.send( o2j(m) ); 	// JSON encode outgoing msg and send it off
					};

					var socket = conn.socket = req.accept(null, req.origin);

					socket.on("error", function(err) {
						cb_ctrl("error", err.toString());
					});

					socket.on("close", function() {
						cb_ctrl("close")
					});

					// incoming msgs from client come through here
					socket.on("message", function(x) {
						D(">>---> "+x.utf8Data)

						var j = x.utf8Data			// raw message is a utf8 string
						var msg_in = j2o(j)
						if(typeof msg_in !== "object") {
							cb_ctrl("error", "unreadable message");
							return;
						}

						if(msg_in.msg) {
							D("initiated")
							msg_in.reply = function(data) {
								send({ msg_id: msg_in.msg_id, response: data, });
							}
							// create an error function.
							msg_in.error = function(err) {
								send({ msg_id: msg_in.msg_id, error: err, response: null, });
							}
							D("  passing msg on "+o2j(msg_in))
							cb_msg(msg_in)
							return
						}

						if(msg_in.response) {
							// response to a server initiated msg
							D("reply to server initiated msg")
							var x = waiting.rem(msg_in.msg_id);
							if(!x) {
								//cb_ctrl("error", "invalid reply ")
								D("no matching msg for reply")
								return
							}
							// route response to associated call back
							var m = x.msg
							var cb = x.cb;
							if(cb) {
								D(" routing reply "+o2j(msg_in.response))
								cb(msg_in.response);
							}

							return
						}

						cb_ctrl("error", "bad message");
					})

					cb_ctrl("connected");

					return conn;
				});
			});
		}

		module.exports = MAWS;

	}

})();


