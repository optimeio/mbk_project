const mongoose = require("mongoose");
const Company = require("../models/Company");
const Trainer = require("../models/Trainer");
const User = require("../models/User");

async function ensureSmGroupsCompanyForTrainers() {
  try {
    // 1. Find or create SM Groups company
    let smCompany = await Company.findOne({
      name: { $regex: /^sm groups$/i },
    });

    if (!smCompany) {
      smCompany = await Company.findOne({
        name: { $regex: /sm groups/i },
      });
    }

    if (!smCompany) {
      smCompany = await Company.create({
        name: "SM Groups",
        email: "contact@smgroups.com",
        adminName: "SM Groups Admin",
        companyCode: "SMG2026",
        status: "active",
      });
      console.log("[MIGRATION] Created SM Groups company:", smCompany._id);
    } else {
      console.log("[MIGRATION] Found SM Groups company:", smCompany._id);
    }

    // 2. Update Trainers without companyId
    const trainerResult = await Trainer.updateMany(
      {
        $or: [
          { companyId: null },
          { companyId: { $exists: false } },
        ],
      },
      {
        $set: {
          companyId: smCompany._id,
          companyCode: smCompany.companyCode || "SMG2026",
        },
      }
    );
    console.log("[MIGRATION] Updated Trainers without companyId:", trainerResult.modifiedCount);

    // 3. Update User accounts for trainers without companyId
    const userResult = await User.updateMany(
      {
        role: "Trainer",
        $or: [
          { companyId: null },
          { companyId: { $exists: false } },
        ],
      },
      {
        $set: {
          companyId: smCompany._id,
        },
      }
    );
    console.log("[MIGRATION] Updated User accounts without companyId:", userResult.modifiedCount);

    return {
      success: true,
      companyId: smCompany._id,
      trainersUpdated: trainerResult.modifiedCount,
      usersUpdated: userResult.modifiedCount,
    };
  } catch (error) {
    console.error("[MIGRATION] Error assigning SM Groups company to trainers:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { ensureSmGroupsCompanyForTrainers };

if (require.main === module) {
  const dotenv = require("dotenv");
  const path = require("path");
  dotenv.config({ path: path.join(__dirname, "../.env") });
  dotenv.config({ path: path.join(__dirname, "../../.env"), override: false });

  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || process.env.MONGODB_URI;
  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log("Connected to MongoDB for SM Groups trainer assignment...");
      const res = await ensureSmGroupsCompanyForTrainers();
      console.log("Result:", res);
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration script failed:", err);
      process.exit(1);
    });
}
