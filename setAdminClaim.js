const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

async function main() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error("Missing email argument. Example: node setAdminClaim.js admin@example.com");
    process.exit(1);
  }

  const candidatePaths = [
    path.join(__dirname, "serviceAccountKey.json"),
    path.join(__dirname, "Admin Stuff", "scameastervn-firebase-adminsdk-fbsvc-202d93081a.json")
  ];

  const serviceAccountPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!serviceAccountPath) {
    console.error("No service account JSON found. Expected one of:");
    candidatePaths.forEach((p) => console.error(`- ${p}`));
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  try {
    const user = await admin.auth().getUserByEmail(targetEmail);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Success: ${targetEmail} is now an admin.`);
  } catch (error) {
    console.error("Failed to set admin claim:", error.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
