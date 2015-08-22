
maws = require("./maws.js");
require("sleepless");

log = function(s) { console.log(s) }
maws.dbg = log

seq = 0
clients = {}

cb_req = function(req, cb_accept) {

	var name = "client-"+(seq += 1)

	var cb_msg = function(m) {
		log(name+": "+o2j(m))
	}

	var cb_ctrl = function(m) {
		//log(name+" [CTRL]: "+m);
		if(m == "close") {
			log(name+" left")
			delete clients[name]
		}
	}
	conn = cb_accept(cb_msg, cb_ctrl)
	clients[name] = {
		conn: conn,
		name: name,
	}
	log(name+" arrived ... saying hello ...")
	conn.send({msg:"welcome to the maws test server"})
}

maws.listen( 12345, cb_req, "docroot")



