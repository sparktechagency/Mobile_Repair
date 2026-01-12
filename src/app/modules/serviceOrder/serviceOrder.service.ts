import httpStatus from "http-status";
import { ServiceOrder } from "./serviceOrder.model";
import { IServiceOrder, IServiceOrderStatus } from "./serviceOrder.interface";
import AppError from "../../error/AppError";
import mongoose, { Types } from "mongoose";
import QueryBuilder from "../../builder/QueryBuilder";
import { computeTrend, shiftDays, shiftMonths, shiftWeeks, startOfMonth, startOfToday, startOfWeek } from "./serviceOrder.utils";
import { User } from "../user/user.model";
import { sendNotificationEmail } from "../../utils/emailNotification";




// const createServiceOrder = async (payload: IServiceOrder) => {
//   // 1️⃣ Create the service order
//   const order = await ServiceOrder.create({
//     ...payload,
//     statusHistory: [{ status: "pending", timestamp: new Date() }],
//   });

//   // 2️⃣ Fetch all verified and active technicians
//   const verifiedTechnicians = await User.find({
//     role: "technician",
//     adminVerified: "verified",
//     isDeleted: { $ne: true },
//     email: { $exists: true, $ne: "" },
//   });

//   // 3️⃣ Send email to each verified technician
//   verifiedTechnicians.forEach(tech => {
//     const subject = "New Service Order Available!";
//     const messageText = `Hello ${tech.name},

// A new service order has been created that may match your expertise. 
// Please check your app dashboard to view details and accept the order.

// Thank you for being a valued technician.`;

//     sendNotificationEmail({
//       sentTo: tech.email,
//       subject,
//       userName: tech.name || "Technician",
//       messageText,
//     }).catch(err => console.error(`Failed to send email to ${tech.email}:`, err.message));
//   });

//   return order;
// };


const createServiceOrder = async (payload: IServiceOrder) => {

  try {
    // 1️⃣ Create the service order
    const order = await ServiceOrder.create({
      ...payload,
      statusHistory: [{ status: "pending", timestamp: new Date() }],
    });

    // 2️⃣ Fetch all verified and active technicians
    const verifiedTechnicians = await User.find({
      role: "technician",
      adminVerified: "verified",
      isDeleted: { $ne: true },
      email: { $exists: true, $ne: "" },
    });

    // 3️⃣ Send email to each verified technician
    for (const tech of verifiedTechnicians) {
      try {
        const subject = "New Service Order Available!";
        const messageText = `Hello ${tech.name},

A new service order has been created that may match your expertise. 
Please check your app dashboard to view details and accept the order.

Thank you for being a valued technician.`;

        await sendNotificationEmail({
          sentTo: tech.email,
          subject,
          userName: tech.name || "Technician",
          messageText,
        });
      } catch (emailErr: any) {
        console.error(
          `❌ Failed to send email to ${tech.email}:`,
          emailErr.message
        );
      }
    }

    return order;
  } catch (err: any) {
    console.error("❌ Failed to create service order:", err.message);
    throw new AppError(500, "Failed to create service order");
  }
};

const getAllServiceOrders = async (
  query = {}
) => {
  // Base filter: exclude deleted orders
  const baseFilter = { isDeleted: false };

  const userQuery = new QueryBuilder(ServiceOrder.find(baseFilter).populate({
        path: "serviceProviderId",
        select: "name email phone", // <-- Get Technician info
      }), query)
    .search(["clientName", "email", "phoneNumber"])
    .filter()   // handles brand, issueType, status, preferedDate
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getMyTechnicianServiceOrdersCounts = async (userId: string) => {
  if (!userId) throw new Error("userId is required");

  const objectId = new mongoose.Types.ObjectId(userId);
  console.log("user id =>>>> ", userId)
  const counts = await ServiceOrder.aggregate([
    { $match: { isDeleted: false, serviceProviderId: objectId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);


  console.log("count data ==>>>> ", counts)
  const totalCounts = counts.reduce(
    (acc, cur) => ({ ...acc, [cur._id]: cur.count }),
    { pending: 0, inprogress: 0, completed: 0 } // matches current status enum
  );

  return totalCounts;
};

const getMyTechnicianDashboard = async (
  userId: string,
  period: "today" | "week" | "month" = "week"
) => {
  if (!userId) throw new AppError(httpStatus.BAD_REQUEST, "userId required");

  const providerId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  let currentStart: Date, previousStart: Date, previousEnd: Date;

  if (period === "today") {
    currentStart = startOfToday();
    previousStart = shiftDays(currentStart, -1);
    previousEnd = currentStart;
  } else if (period === "month") {
    currentStart = startOfMonth();
    previousStart = shiftMonths(currentStart, -1);
    previousEnd = currentStart;
  } else {
    currentStart = startOfWeek();
    previousStart = shiftWeeks(currentStart, -1);
    previousEnd = currentStart;
  }

  const basePipeline = [
    { $match: { isDeleted: false, serviceProviderId: providerId } },
    { $addFields: { latestStatusHistory: { $arrayElemAt: ["$statusHistory", -1] } } },
  ];

  const currentAgg = [
    ...basePipeline,
    {
      $match: {
        "latestStatusHistory.timestamp": { $gte: currentStart, $lte: now }
      }
    },
    { $group: { _id: "$latestStatusHistory.status", count: { $sum: 1 } } },
  ];

  const previousAgg = [
    ...basePipeline,
    {
      $match: {
        "latestStatusHistory.timestamp": { $gte: previousStart, $lt: previousEnd }
      }
    },
    { $group: { _id: "$latestStatusHistory.status", count: { $sum: 1 } } },
  ];

  const [currentRaw, previousRaw] = await Promise.all([
    ServiceOrder.aggregate(currentAgg),
    ServiceOrder.aggregate(previousAgg),
  ]);

  const statuses: IServiceOrderStatus[] = ["pending", "inprogress", "completed"];
  const currentMap: Record<string, number> = {};
  const previousMap: Record<string, number> = {};

  currentRaw.forEach((r) => (currentMap[r._id] = r.count));
  previousRaw.forEach((r) => (previousMap[r._id] = r.count));

  const result: any = {};

  statuses.forEach((s) => {
    const cur = currentMap[s] || 0;
    const prev = previousMap[s] || 0;
    result[s] = {
      count: cur,
      trend: computeTrend(cur, prev, period),
    };
  });

  return result;
};


const getMyMonthlyServiceStats = async (
  serviceProviderId: string,
  year: number
) => {
  const providerObjectId = new mongoose.Types.ObjectId(serviceProviderId);

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  const result = await ServiceOrder.aggregate([
    // Match the provider and valid year
    {
      $match: {
        serviceProviderId: providerObjectId,
        isDeleted: false,
        "statusHistory.timestamp": { $gte: startDate, $lte: endDate },
      },
    },

    // Unwind the statusHistory array to handle each status change separately
    { $unwind: "$statusHistory" },

    // Filter only inprogress and completed statuses within the year
    {
      $match: {
        "statusHistory.status": { $in: ["inprogress", "completed"] },
        "statusHistory.timestamp": { $gte: startDate, $lte: endDate },
      },
    },

    // Group by month and status
    {
      $group: {
        _id: {
          month: { $month: "$statusHistory.timestamp" },
          status: "$statusHistory.status",
        },
        count: { $sum: 1 },
      },
    },

    // Re-group to merge statuses per month
    {
      $group: {
        _id: "$_id.month",
        statuses: {
          $push: { status: "$_id.status", count: "$count" },
        },
      },
    },

    // Transform structure for output
    {
      $project: {
        _id: 0,
        month: "$_id",
        inprogress: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$statuses",
                  as: "s",
                  cond: { $eq: ["$$s.status", "inprogress"] },
                },
              },
            },
            { count: 0 },
          ],
        },
        completed: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$statuses",
                  as: "s",
                  cond: { $eq: ["$$s.status", "completed"] },
                },
              },
            },
            { count: 0 },
          ],
        },
      },
    },
    {
      $project: {
        month: 1,
        inprogress: "$inprogress.count",
        completed: "$completed.count",
      },
    },
    { $sort: { month: 1 } },
  ]);

  // Fill missing months
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthData = result.find((r) => r.month === i + 1);
    return {
      month: i + 1,
      inprogress: monthData?.inprogress || 0,
      completed: monthData?.completed || 0,
    };
  });

  return monthlyStats;
};

const getMyTechnicianServiceOrders = async (
  userId: string,
  query:  {}
) => {

  if (!userId) throw new Error("userId is required");

  const providerId = new mongoose.Types.ObjectId(userId);
  // Base filter: only orders assigned to this technician
  const baseFilter = {
    isDeleted: false,
    serviceProviderId: providerId,
  };



  const qb = new QueryBuilder(ServiceOrder.find(baseFilter), query)
    .search(["clientName", "email", "phoneNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { meta, result };
};

const getPendingServiceOrders = async (
  query: {}
) => {
  // Base filter: only pending, not deleted
  const baseFilter = {
    status: "pending",
    isDeleted: false,
  };

  // Initialize QueryBuilder
  const userQuery = new QueryBuilder(ServiceOrder.find(baseFilter), query)
    .search(["clientName", "email", "phoneNumber"])
    .filter() // brand, issueType, preferedDate handled in filter
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getServiceOrderById = async (id: string) => {
  const order = await ServiceOrder.findById(id);
  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }
  return order;
};


const acceptServiceOrder = async (
  orderId: string,
  userId: string
) => {
  const order = await ServiceOrder.findById(orderId);

  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Order not found");
  }

  // ✅ Business rule: only pending orders can be accepted
  if (order.status !== "pending") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending orders can be accepted"
    );
  }

  // ✅ Assign technician and update status
  order.status = "inprogress";
  order.serviceProviderId = new Types.ObjectId(userId);

  // ✅ Push status history
  order.statusHistory.push({
    status: "inprogress",
    timestamp: new Date(),
  });

  await order.save();

// ✅ Send email notification to client
const technician = await User.findById(userId);
if (technician && order.email) {
  const subject = "Your Service Order Has Been Accepted!";
  const messageText = `Good news! Your service order has been accepted by ${technician.name}.

You can contact the technician directly using the details below:

Phone: ${technician.phone || "N/A"}
Email: ${technician.email || "N/A"}

Thank you for using our service.`;

  sendNotificationEmail({
    sentTo: order.email,
    subject,
    userName: order.clientName,
    messageText,
  }).catch((err) => {
    console.error("Failed to send email:", err.message);
  });
}

  return order;
};


const completeServiceOrder = async (
  orderId: string,
  userId: string // technician completing the order
) => {

  const order = await ServiceOrder.findById(orderId);

  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Order not found");
  }

  // Only inprogress orders can be completed
  if (order.status !== "inprogress") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only accepted orders can be marked as completed"
    );
  }

  // Optional: validate that the technician completing the order is assigned
  if (!order.serviceProviderId?.equals(userId)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not authorized to complete this service order"
    );
  }

  // Update status
  order.status = "completed";

  // Add to status history
  order.statusHistory.push({
    status: "completed",
    timestamp: new Date(),
  });

  await order.save();

  // ✅ Send email to client
  const technician = await User.findById(userId);
  if (technician && order.email) {
    const subject = "Your Service Order is Completed!";
    const messageText = `Hello ${order.clientName},

  Good news! Your service order has been successfully completed by ${technician.name}. Thank you for using our service.`;

    sendNotificationEmail({
      sentTo: order.email,
      subject,
      userName: order.clientName,
      messageText,
    }).catch(err => console.error("Failed to send email:", err.message));
  }

  return order;
};

const enRouteServiceOrder = async (
  orderId: string,
  userId: string // technician going en route
) => {
  const order = await ServiceOrder.findById(orderId);

  if (!order || order.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Order not found");
  }

  // // Only pending orders can be marked as inprogress
  // if (order.status !== "pending") {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     "Only pending orders can be marked as en route"
  //   );
  // }

  // // Assign technician
  // order.status = "inprogress";
  // order.serviceProviderId = userId;

  // // Add status history
  // order.statusHistory.push({
  //   status: "inprogress",
  //   timestamp: new Date(),
  // });

  // await order.save();

  // ✅ Send email to client
  const technician = await User.findById(userId);

  if (technician && order.email) {
    const subject = "Your Service Technician Is On the Way 🚗";
    const messageText = `Hello ${order.clientName},

Good news! Your service technician ${technician.name} is on the way to your location.

Service Details:
• Brand: ${order.brand}
• Model: ${order.model}
• Preferred Time: ${order.preferedTime}

Please ensure someone is available at the service address.

Thank you for choosing our service.`;

    sendNotificationEmail({
      sentTo: order.email,
      subject,
      userName: order.clientName,
      messageText,
    }).catch(err =>
      console.error("Failed to send en route email:", err.message)
    );
  }

  return order;
};


const deleteServiceOrder = async (id: string) => {
  const result = await ServiceOrder.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }
  return result;
};

export const ServiceOrderService = {
  createServiceOrder,
  getAllServiceOrders,
  getServiceOrderById,
  getMyTechnicianDashboard,
  getMyMonthlyServiceStats,
  getMyTechnicianServiceOrders,
  getMyTechnicianServiceOrdersCounts,
  getPendingServiceOrders,
  completeServiceOrder,
  enRouteServiceOrder,
  acceptServiceOrder,
  deleteServiceOrder,
};
