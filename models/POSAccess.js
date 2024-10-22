const mongoose = require("mongoose");

const posAccessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  accessCode: {
    type: Number,
    required: true,
    unique: true,
  },

  uuid: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
});

const POSAccess = mongoose.model("POSAccess", posAccessSchema);

module.exports = POSAccess;
