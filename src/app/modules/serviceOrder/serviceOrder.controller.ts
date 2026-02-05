import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ServiceOrderService } from "./serviceOrder.service";
import httpStatus from "http-status";

const create = catchAsync(async (req, res) => {
  const result = await ServiceOrderService.createServiceOrder(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service order created successfully",
    data: result,
  });
});

const getAllServiceOrders = catchAsync(async (req, res) => {
  const result = await ServiceOrderService.getAllServiceOrders();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service orders retrieved successfully",
    data: result,
  });
});

const getById = catchAsync(async (req, res) => {
  const result = await ServiceOrderService.getServiceOrderById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service order retrieved successfully",
    data: result,
  });
});

 const getMyTechnicianServiceOrders = catchAsync(async (req, res) => {

  const {userId} = req.user;

  const result  = await ServiceOrderService.getMyTechnicianServiceOrders(userId, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your assigned service orders retrieved successfully",
    data: result,
  });
});

 const getMyTechnicianServiceOrdersCounts = catchAsync(async (req, res) => {

  const {userId} = req.user;

  const result  = await ServiceOrderService.getMyTechnicianServiceOrdersCounts(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Your service order counts retrieved successfully",
    data: result,
  });
});

const getMyTechnicianDashboard = catchAsync(
  async (req, res) => {
    const userId = req.user?.userId;
    const { period = "week" } = req.query as {
      period: "today" | "week" | "month";
    };

    const data = await ServiceOrderService.getMyTechnicianDashboard(userId, period);

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Technician Dashboard data for ${period}`,
      data,
    });
  }
);


const getPendingServiceOrders = catchAsync(async (req, res) => {

  const result  = await ServiceOrderService.getPendingServiceOrders(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending service orders retrieved successfully",
    data: result,
  });
});


const getMyMonthlyServiceStats = catchAsync(async (req, res) => {

  const {userId} = req.user;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();


  const result  = await ServiceOrderService.getMyMonthlyServiceStats(userId, year);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Monthly service order statistics retrieved successfully",
    data: result,
  });
});




const acceptServiceOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.userId;



  const result = await ServiceOrderService.acceptServiceOrder(orderId, userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service Order Accepted Successfully",
    data: result,
  });


});


const completeServiceOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user.userId; // extracted from auth middleware

    const result = await  ServiceOrderService.completeServiceOrder(orderId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service order marked as completed successfully",
      data: result,
    });
  }
);

const enRouteServiceOrder = catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user.userId; // extracted from auth middleware

    const result = await  ServiceOrderService.enRouteServiceOrder(orderId, userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "En Route Mail Sent Successfully",
      data: result,
    });
  }
);




const softDelete = catchAsync(async (req, res) => {
  const result = await ServiceOrderService.deleteServiceOrder(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service order deleted successfully",
    data: result,
  });
});

export const ServiceOrderController = {
  create,
  getAllServiceOrders,
  getPendingServiceOrders,
  getMyTechnicianServiceOrders,
  getMyTechnicianServiceOrdersCounts,
  getMyTechnicianDashboard,
  getMyMonthlyServiceStats,
  getById,
  completeServiceOrder,
  enRouteServiceOrder,
  acceptServiceOrder,
  softDelete,
};
