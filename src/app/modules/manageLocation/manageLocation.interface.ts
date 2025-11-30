import { Model } from "mongoose";

export interface IManageLocation {
  name: string;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  isDeleted?: boolean;
}

export type ManageLocationModel = Model<IManageLocation>;
