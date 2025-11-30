import { Router } from "express";
import { ManageLocationController } from "./manageLocation.controller";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

export const manageLocationRoutes = Router();

manageLocationRoutes
  // Create a new location
  .post(
    "/add", 
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
    ManageLocationController.createLocation)

  // Get all locations
  .get("/all", ManageLocationController.getAllLocations)

  // Get single location
  .get("/:id", ManageLocationController.getSingleLocation)

  // Update location
  .put(
    "/update/:id", 
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
    ManageLocationController.updateLocation
)

  // Delete location
  .delete("/:id", ManageLocationController.deleteLocation);
