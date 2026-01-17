import { Schema, model } from "mongoose";
import { IManagePrice } from "./managePrice.interface";

const managePriceSchema = new Schema<IManagePrice>(
  {
    icon: { type: String, required: true },
    title: { type: String, required: true },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ManagePrice = model<IManagePrice>("ManagePrice", managePriceSchema);
