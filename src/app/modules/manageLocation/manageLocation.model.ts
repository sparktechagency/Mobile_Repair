import { Schema, model } from "mongoose";
import { IManageLocation, ManageLocationModel } from "./manageLocation.interface";

const manageLocationSchema = new Schema<IManageLocation>(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },

    // GeoJSON Point
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],   // [longitude, latitude]
        required: true,
      },
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create 2dsphere index
manageLocationSchema.index({ location: "2dsphere" });

// auto filter
manageLocationSchema.pre("find", function (next) {
  this.find({ isDeleted: false });
  next();
});
manageLocationSchema.pre("findOne", function (next) {
  this.find({ isDeleted: false });
  next();
});

export const ManageLocation = model<IManageLocation, ManageLocationModel>(
  "ManageLocation",
  manageLocationSchema
);
