const { google } = require("googleapis");
const { validateDriveConfiguration } = require("../services/googleDriveService.js");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

(async () => {
  try {
    console.log("Validating Google Drive Configuration...");
    const result = await validateDriveConfiguration();
    console.log("Validation Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error occurred:", err.message);
  }
})();
