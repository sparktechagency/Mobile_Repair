import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { USER_ROLE } from "../user/user.constants";
import { managePriceControllers } from "./managePrice.controller";
import { managePriceValidation } from "./managePrice.validation";
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
const upload = fileUpload('./public/uploads/icons');


const router = Router();

// ✅ Create Manage Price (Admin, SuperAdmin only)
router
    .post(
        "/",
        // auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
        upload.single('image'),
        parseData(),
        validateRequest(managePriceValidation.createManagePriceSchema),
        managePriceControllers.createManagePrice
    )

    // ✅ Get All Manage Prices (Public or restricted? You decide)
    .get(
        "/",
        managePriceControllers.getAllManagePrices
    )

    // ✅ Update Manage Price
    .patch(
        "/update/:id",
        // auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
        upload.single('image'),
        parseData(),
        validateRequest(managePriceValidation.updateManagePriceSchema),
        managePriceControllers.updateManagePrice
    )

    // ✅ Delete Manage Price (Soft Delete)
    .delete(
        "/:id",
        // auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
        managePriceControllers.deleteManagePrice
    )   

export const managePriceRoutes = router;
