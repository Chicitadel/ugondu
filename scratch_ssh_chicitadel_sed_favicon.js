const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `cd ~/domains/chicitadel.com/public_html && sed -i "s|<link rel=\\"shortcut icon\\".*/>|<link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"/favicon.ico\\">|g" index.html && echo DONE`;
  conn.exec(cmd, (err, stream) => {
    stream.on("close", () => conn.end()).on("data", (data) => console.log("STDOUT:\\n" + data)).stderr.on("data", (data) => console.log("STDERR:\\n" + data));
  });
}).connect({ host: "162.244.94.48", port: 22, username: "ujomorco", password: "m0qqGV9;S-28Eq" });
