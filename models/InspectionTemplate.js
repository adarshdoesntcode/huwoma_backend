const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InspectionTemplateSchema = new Schema(
  {
    categoryName: { type: String, required: true },
    scope: {
      type: String,
      enum: ["interior", "exterior"],
      default: "exterior",
    },
    items: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionTemplate", InspectionTemplateSchema);
