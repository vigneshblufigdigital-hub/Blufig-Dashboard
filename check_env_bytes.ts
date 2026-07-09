const pass = process.env.SMTP_PASS;
if (pass) {
  console.log("SMTP_PASS length:", pass.length);
  console.log("SMTP_PASS bytes:", Array.from(pass).map(c => c.charCodeAt(0)));
  console.log("SMTP_PASS string:", JSON.stringify(pass));
} else {
  console.log("SMTP_PASS is not set in process.env");
}

const user = process.env.SMTP_USER;
if (user) {
  console.log("SMTP_USER length:", user.length);
  console.log("SMTP_USER bytes:", Array.from(user).map(c => c.charCodeAt(0)));
  console.log("SMTP_USER string:", JSON.stringify(user));
} else {
  console.log("SMTP_USER is not set in process.env");
}
process.exit(0);
