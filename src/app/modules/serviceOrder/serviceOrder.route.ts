import express from "express";
import { ServiceOrderController } from "./serviceOrder.controller";
import { ServiceOrderValidation } from "./serviceOrder.validation";
import validateRequest from "../../middleware/validateRequest";
import auth from "../../middleware/auth";
import { USER_ROLE } from "../user/user.constants";

const router = express.Router();

router.post(
    "/",
    validateRequest(
        ServiceOrderValidation.createServiceOrderValidation
    ),
    ServiceOrderController.create
    )


    .patch(
        "/accept/:orderId",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.acceptServiceOrder
    )

    .patch(
        "/complete/:orderId",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.completeServiceOrder
    )
    .patch(
        "/en-route/:orderId",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.enRouteServiceOrder
    )



    .get(
        "/all", 
        ServiceOrderController.getAllServiceOrders
    )

    .get(
        "/pending",
        ServiceOrderController.getPendingServiceOrders
    )


    .get(
        "/technician/dashboard",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.getMyTechnicianDashboard
    )
    
    .get(
        "/technician/monthly/stats",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.getMyMonthlyServiceStats
    )
    
    .get(
        "/my-orders/counts",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.getMyTechnicianServiceOrdersCounts
    )

    .get(
        "/my-orders",
        auth(USER_ROLE.TECHNICIAN),
        ServiceOrderController.getMyTechnicianServiceOrders
    )

    .get(
        "/:id", 
        ServiceOrderController.getById
    )

    .delete(
        "/:id", 
        ServiceOrderController.softDelete
    );

export const ServiceOrderRoutes = router;
