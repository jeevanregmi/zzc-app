const admin = require("firebase-admin");
const fs = require("fs-extra");

const serviceAccount = require("../../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadStructured() {

  const schemes = await fs.readJson("./structuredSchemes.json");

  for (const scheme of schemes) {

    await db.collection("structuredSchemes").add({
      ...scheme,
      createdAt: new Date(),
    });

    console.log("Uploaded:", scheme.title);

  }

  console.log("All structured schemes uploaded 🚀");

}

uploadStructured();