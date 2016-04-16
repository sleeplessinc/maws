
maws = require("./maws.js");

maws.dbg = function(s) { console.log("MAWS: "+s) }

seq = 0

connect = function(req, cb_accept) {

	var name = "client-"+(seq += 1)

	var cb_msg = function(m) {
		console.log(name+": "+JSON.stringify(m))

		if(m.msg == "hello") {
			m.reply({msg:"welcome", name:name})
			conn.send({msg:"ping"}, function(r) {
				console.log(JSON.stringify(r));
			})
		}
	}

	var cb_ctrl = function(s, xtra) {
		console.log("[CTRL] "+name+": "+s+", ["+JSON.stringify(xtra)+"]")
	}

	var conn = cb_accept(cb_msg, cb_ctrl)

}

maws.listen( 12345, connect, "docroot")

