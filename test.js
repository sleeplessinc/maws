
maws = require("./maws.js");
require("sleepless");

// maws.dbg = function(s) { log("MAWS: "+s) }

seq = 0
clients = {}

who = function() {
	var a = []
	for(var k in clients) {
		a.push(clients[k].name);
	}
	return a
}


bcast = function(m) {
	for(var k in clients) {
		log("::bcast:: "+k+" "+o2j(m))
		var client = clients[k];
		client.conn.send(m)
	}
}

bcast_who = function() {
	bcast({msg:'who', who:who()});
}


m_who = function(m) {
	m.reply({who:who()})
}

m_chat = function(m, client) {
	//var s = client.name+" says, \""+m.text+"\"";
	m.name = client.name
	bcast(m);
}


connect = function(req, cb_accept) {

	var name = "client-"+(seq += 1)

	var cb_msg = function(m) {
		log(name+": "+o2j(m))

		var f = global["m_"+m.msg]
		if(f) {
			f(m, clients[name])
			return
		}

	}

	var cb_ctrl = function(s, xtra) {
		log("[CTRL] "+name+": "+s+", ["+o2j(xtra)+"]")

		if(s === "close") {
			delete clients[name]
			bcast_who();
			bcast({msg:"depart", name:name});
			return
		}
	}

	conn = cb_accept(cb_msg, cb_ctrl)
	clients[name] = {
		conn: conn,
		name: name,
	}

	conn.send({msg:"welcome to the maws test server"})

	bcast_who();
	bcast({msg:"arrive", name:name});
}

maws.listen( 12345, connect, "docroot")



