import nodemailer from "nodemailer";

async function runTest() {
  const smtpPass = process.env.SMTP_PASS || "j7Dzo/|tL/~";

  const users = [
    "info@blufigdigital.co",
    "flowblufig@blufigdigital.co"
  ];

  const combinations = [
    { host: "smtp.hostinger.com", port: 465, secure: true },
    { host: "smtp.hostinger.com", port: 587, secure: false },
  ];

  for (const user of users) {
    for (const config of combinations) {
      console.log(`\n--------------------------------------------`);
      console.log(`Trying User: ${user} with ${config.host}:${config.port} (secure: ${config.secure})`);
      
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: {
            user: user,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000,
        });

        await transporter.verify();
        console.log(`✅ SUCCESS! User: ${user} at ${config.host}:${config.port} authenticated successfully!`);
        return;
      } catch (err: any) {
        console.log(`❌ FAILED for ${user} at ${config.host}:${config.port}: ${err.message}`);
      }
    }
  }

  console.log("\nAll combinations failed.");
}

runTest();
