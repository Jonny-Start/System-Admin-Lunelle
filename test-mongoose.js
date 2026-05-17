const mongoose = require('mongoose');
const Company = require('./src/models/Company');

async function run() {
  const companyId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  
  const c = new Company({
    _id: companyId,
    name: "Test",
    owner: userId
  });
  console.log(c);
  console.log("owner is:", c.owner);
}
run();
