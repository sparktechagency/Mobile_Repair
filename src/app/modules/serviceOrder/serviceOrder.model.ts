import { model, Schema } from "mongoose";
import { IServiceOrder, IServiceOrderStatus } from "./serviceOrder.interface";

const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ["pending",  "inprogress", "completed"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const serviceOrderSchema = new Schema<IServiceOrder>(
  {
    clientName: { 
      type: String, 
      required: true 
    },
    phoneNumber: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true 
    },
    serviceAddress: { 
      type: String, 
      required: true 
    },
    location: {
      latitude: { 
        type: Number, 
        required: true 
      },
      longitude: { 
        type: Number, 
        required: true 
      },
    },
    brand: { 
      type: String, 
      required: true 
    },
    productline: { 
      type: String, 
      required: true 
    },
    model: { 
      type: String, 
      required: true 
    },
    variant: { 
      type: String, 
      required: true 
    },
    issueType: { 
      type: String, 
      required: true 
    },
    issueDescription: { 
      type: String 
    },
    preferedDate: { 
      type: Date, 
      required: true 
    },
    preferedTime: { 
      type: String, 
      required: true 
    },
    isAllAgreement: { 
      type: Boolean, 
      default: false 
    },
    status: {
      type: String,
      enum: ["pending", "inprogress", "completed"],
      default: "pending",
    },
    serviceProviderId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    },
    statusHistory: { 
      type: [statusHistorySchema], 
      default: [] 
    },
    isDeleted: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true }
);

export const ServiceOrder = model<IServiceOrder>(
  "ServiceOrder",
  serviceOrderSchema
);
