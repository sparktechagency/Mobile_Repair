
import httpStatus from "http-status";
import { ManageLocationService } from "./manageLocation.service";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

// ➤ Create Location
const createLocation = catchAsync(async (req, res) => {
  const result = await ManageLocationService.createLocation(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Location created successfully",
    data: result,
  });
});

// ➤ Get Single Location
const getSingleLocation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ManageLocationService.getSingleLocation(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location fetched successfully",
    data: result,
  });
});

// ➤ Get All Locations
const getAllLocations = catchAsync(async (req, res) => {
  const result = await ManageLocationService.getAllLocations();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Locations fetched successfully",
    data: result,
  });
});

// ➤ Update Location
const updateLocation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ManageLocationService.updateLocation(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location updated successfully",
    data: result,
  });
});

// ➤ Delete Location
const deleteLocation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ManageLocationService.deleteLocation(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Location deleted successfully",
    data: result,
  });
});

// --------------------------------------------------
// 📌 FINAL EXPORT (as you requested)
// --------------------------------------------------
export const ManageLocationController = {
  createLocation,
  getSingleLocation,
  getAllLocations,
  updateLocation,
  deleteLocation,
};
