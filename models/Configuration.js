const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConfigurationSchema = new Schema(
  {},
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Configuration", ConfigurationSchema);
