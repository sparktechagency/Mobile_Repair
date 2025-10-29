import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ManagePriceService } from "./managePrice.service";
import { deleteFile, storeFile } from "../../utils/fileHelper";
import httpStatus from "http-status";
import { ManagePrice } from "./managePrice.model";
import AppError from "../../error/AppError";

// ➕ Create Manage Price
const createManagePrice = catchAsync(async (req,  res: Response) => {

  if (req?.file) {
      // console.log("req file =>>>> ",req.file)
      req.body.icon = storeFile('icons', req?.file?.filename);
    }

  const result = await ManagePriceService.createManagePrice(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Manage Price created successfully",
    data: result,
  });
});

// 📌 Get All Manage Prices
const getAllManagePrices = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagePriceService.getAllManagePrices();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manage Prices retrieved successfully",
    data: result,
  });
});

// ✍️ Update Manage Price
const updateManagePrice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
     // 1️⃣ Find existing data
  const existing = await ManagePrice.findById(id);
  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Manage Price not found");
  }

  // 2️⃣ If new file uploaded -> delete previous file + update icon
  if (req.file) {
    // ❌ Delete previous file if exists
    if (existing.icon) {
      deleteFile(existing.icon); // <-- ✅ You must already have this util function
    }

    // ✅ Save new file path
    req.body.icon = storeFile("icons", req.file.filename);
  }

  const result = await ManagePriceService.updateManagePrice(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manage Price updated successfully",
    data: result,
  });
});

// 🗑 Soft Delete Manage Price
const deleteManagePrice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ManagePriceService.deleteManagePrice(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Manage Price deleted successfully",
    data: result,
  });
});

export const managePriceControllers = {
  createManagePrice,
  getAllManagePrices,
  updateManagePrice,
  deleteManagePrice,
};