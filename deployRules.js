// Deploy Firestore rules using Firebase Admin SDK + Security Rules REST API
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const https = require("https");

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(
  readFileSync("Admin Stuff/serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "scameastervn"
});

const PROJECT_ID = "scameastervn";
const RULES_CONTENT = readFileSync("./firestore.rules", "utf8");

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function deployRules() {
  try {
    // Get access token from service account
    const tokenResult = await admin.app().options.credential.getAccessToken();
    const accessToken = tokenResult.access_token;
    console.log("✅ Got access token");

    const rulesetBody = {
      source: {
        files: [
          {
            name: "firestore.rules",
            content: RULES_CONTENT
          }
        ]
      }
    };

    const createOptions = {
      hostname: "firebaserules.googleapis.com",
      path: `/v1/projects/${PROJECT_ID}/rulesets`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    };

    console.log("📤 Creating ruleset...");
    const createResult = await httpsRequest(createOptions, rulesetBody);
    
    if (createResult.status !== 200) {
      console.error("❌ Failed to create ruleset:", JSON.stringify(createResult.body, null, 2));
      process.exit(1);
    }

    const rulesetName = createResult.body.name;
    console.log("✅ Ruleset created:", rulesetName);

    const releaseBody = {
      release: {
        name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
        rulesetName: rulesetName
      }
    };

    const updateOptions = {
      hostname: "firebaserules.googleapis.com",
      path: `/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    };

    console.log("📤 Updating Firestore release...");
    const updateResult = await httpsRequest(updateOptions, releaseBody);

    if (updateResult.status !== 200) {
      console.log("⚠️  PATCH failed, trying POST to create release...");
      const createReleaseOptions = {
        hostname: "firebaserules.googleapis.com",
        path: `/v1/projects/${PROJECT_ID}/releases`,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      };
      const createReleaseResult = await httpsRequest(createReleaseOptions, releaseBody);
      if (createReleaseResult.status !== 200) {
        console.error("❌ Failed to create release:", JSON.stringify(createReleaseResult.body, null, 2));
        process.exit(1);
      }
      console.log("✅ Release created:", JSON.stringify(createReleaseResult.body, null, 2));
    } else {
      console.log("✅ Firestore release updated:", JSON.stringify(updateResult.body, null, 2));
    }

    console.log("\n🎉 Firestore rules deployed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

deployRules();
