import { Types } from "mongoose";

export type IServiceOrderStatus = "pending" | "inprogress" | "completed";

export type IStatusHistory = {
  status: IServiceOrderStatus;
  timestamp: Date;
};

export interface IServiceOrder {
  clientName: string;
  phoneNumber: string;
  email: string;
  serviceAddress: string;
  location: {
    latitude: number;
    longitude: number;
  };
  brand: string;
  productline: string;
  model: string;
  variant: string;
  issueType: string;
  issueDescription: string;
  preferedDate: Date;
  preferedTime: string;
  isAllAgreement: boolean;
  status: IServiceOrderStatus;
  serviceProviderId: Types.ObjectId | null;
  statusHistory: IStatusHistory[];
  isDeleted: boolean;
}
