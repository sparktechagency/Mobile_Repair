import AppError from "../../error/AppError";
import { ManagePrice } from "./managePrice.model";
import httpStatus from "http-status";

const createManagePrice = async (payload: any) => {
  const result = await ManagePrice.create(payload);
  return result;
};

const getAllManagePrices = async () => {
  const result = await ManagePrice.find({ isDeleted: false }).sort({ createdAt: -1 });
  return result;
};

const getSingleManagePrice = async (id: string) => {
  const result = await ManagePrice.findById(id);
  if (!result || result.isDeleted)
    throw new AppError(httpStatus.NOT_FOUND, "Manage Price not found");

  return result;
};

const updateManagePrice = async (id: string, payload: any) => {
  const result = await ManagePrice.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, "Manage Price update failed");

  return result;
};

const deleteManagePrice = async (id: string) => {
  
  const result = await ManagePrice.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!result)
    throw new AppError(httpStatus.BAD_REQUEST, "Manage Price delete failed");

  return result;
};

export const ManagePriceService = {
  createManagePrice,
  getAllManagePrices,
  getSingleManagePrice,
  updateManagePrice,
  deleteManagePrice,
};
