const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `ls -la ~/domains/static.airroofers.eu_bkup/releases/release_20260729_211618/`;
  conn.exec(cmd, (err, stream) => {
    stream.on("close", () => conn.end()).on("data", (data) => console.log("STDOUT:\\n" + data)).stderr.on("data", (data) => console.log("STDERR:\\n" + data));
  });
}).connect({ host: "162.244.94.48", port: 22, username: "ujomorco", password: "m0qqGV9;S-28Eq" });
