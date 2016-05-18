
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


if(process.argv.length < 4) {
	maws.listen( 12345, connect, "docroot", function() {
		console.log("http Listening!");
	})
}
else {
	fs = require('fs');
	ssl_key = fs.readFileSync(process.argv[2]);
	ssl_cert = fs.readFileSync(process.argv[3]);
	maws.listen( { port: 12346, ssl: true, key:ssl_key, cert:ssl_cert }, connect, "docroot", function() {
		console.log("https Listening!");
	})
}


