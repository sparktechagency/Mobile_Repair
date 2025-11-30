import httpStatus from "http-status";
import { ManageLocation } from "./manageLocation.model";
import AppError from "../../error/AppError";

const createLocation = async (payload: any) => {
  const data = {
    name: payload.name,
    address: payload.address,
    location: {
      type: "Point",
      coordinates: [payload.longitude, payload.latitude],
    },
  };

  return await ManageLocation.create(data);
};

const updateLocation = async (id: string, payload: any) => {
  const existing = await ManageLocation.findById(id);
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

  const data: any = {
    name: payload.name,
    address: payload.address,
  };

  if (payload.latitude && payload.longitude) {
    data.location = {
      type: "Point",
      coordinates: [payload.longitude, payload.latitude],
    };
  }

  return await ManageLocation.findByIdAndUpdate(id, data, { new: true });
};

const deleteLocation = async (id: string) => {
  const existing = await ManageLocation.findById(id);
  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Location not found");

  return await ManageLocation.findByIdAndUpdate(id, { isDeleted: true });
};

const getAllLocations = async () => {
  return await ManageLocation.find().sort({ createdAt: -1 });
};

const getSingleLocation = async (id: string) => {
  return await ManageLocation.findById(id);
};

export const ManageLocationService = {
  createLocation,
  updateLocation,
  deleteLocation,
  getAllLocations,
  getSingleLocation,
};
