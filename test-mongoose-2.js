require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./src/models/Company');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const companyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    
    console.log("userId:", userId);
    
    const company = await Company.create({
      _id: companyId,
      name: "Test Company Name",
      owner: userId
    });
    console.log("Success:", company);
  } catch (err) {
    console.error("Error creating company:", err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
