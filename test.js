
maws = require("./maws.js");
require("sleepless");

// maws.dbg = function(s) { log("MAWS: "+s) }

seq = 0
clients = {}


bcast = function(m) {
	for(var k in clients) {
		log("::bcast:: "+k);
		var client = clients[k];
		client.conn.send(m)
	}
}


connect = function(req, cb_accept) {

	var name = "client-"+(seq += 1)

	var cb_msg = function(m) {
		log(name+": "+o2j(m))

		if(m.msg == "ping") {
			var a = []
			for(var k in clients) {
				a.push(clients[k].name);
			}
			m.reply({clients:a})
		}
	}

	var cb_ctrl = function(s, xtra) {
		log("[CTRL] "+name+": "+s+", ["+o2j(xtra)+"]")
		if(s === "close") {
			delete clients[name]
		}
		bcast({msg:"left", name:name});
	}

	conn = cb_accept(cb_msg, cb_ctrl)
	clients[name] = {
		conn: conn,
		name: name,
	}

	log(name+" arrived ... saying hello ...")
	conn.send({msg:"welcome to the maws test server"})
}

maws.listen( 12345, connect, "docroot")



