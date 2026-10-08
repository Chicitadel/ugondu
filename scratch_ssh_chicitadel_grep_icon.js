const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `cat ~/domains/chicitadel.com/public_html/index.html | grep -i "icon" | head -n 5`;
  conn.exec(cmd, (err, stream) => {
    stream.on("close", () => conn.end()).on("data", (data) => console.log("STDOUT:\\n" + data)).stderr.on("data", (data) => console.log("STDERR:\\n" + data));
  });
}).connect({ host: "162.244.94.48", port: 22, username: "ujomorco", password: "m0qqGV9;S-28Eq" });
