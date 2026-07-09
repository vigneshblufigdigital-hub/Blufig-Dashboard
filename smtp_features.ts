import tls from "tls";

function checkSmtpFeatures() {
  const socket = tls.connect(465, "smtp.hostinger.com", { rejectUnauthorized: false }, () => {
    console.log("Connected to smtp.hostinger.com:465");
  });

  socket.on("data", (data) => {
    const response = data.toString();
    console.log("SERVER:", response);

    if (response.startsWith("220")) {
      socket.write("EHLO localhost\r\n");
    } else if (response.includes("250")) {
      socket.end();
    }
  });

  socket.on("error", (err) => {
    console.error("SOCKET ERROR:", err.message);
  });

  socket.on("end", () => {
    console.log("Connection closed.");
    process.exit(0);
  });
}

checkSmtpFeatures();
