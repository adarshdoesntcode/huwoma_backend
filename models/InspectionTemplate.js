const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InspectionTemplateSchema = new Schema(
  {
    categories: [
      {
        categoryName: { type: String, required: true },
        items: [
          {
            itemName: { type: String, required: true },
            itemType: {
              type: Boolean,
              default: false,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InspectionTemplate", InspectionTemplateSchema);
