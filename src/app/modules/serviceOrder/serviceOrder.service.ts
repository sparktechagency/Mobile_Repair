import httpStatus from "http-status";
import { ServiceOrder } from "./serviceOrder.model";
import { IServiceOrder, IServiceOrderStatus } from "./serviceOrder.interface";
import AppError from "../../error/AppError";
import mongoose, { Types } from "mongoose";
import QueryBuilder from "../../builder/QueryBuilder";
import { computeTrend, shiftDays, shiftMonths, shiftWeeks, startOfMonth, startOfToday, startOfWeek } from "./serviceOrder.utils";



const createServiceOrder = async (payload: IServiceOrder) => {
  const order = await ServiceOrder.create({
    ...payload,
    statusHistory: [{ status: "pending" }],
  });
  return order;
};

const getAllServiceOrders = async (
  query = {}
) => {
  // Base filter: exclude deleted orders
  const baseFilter = { isDeleted: false };

  const userQuery = new QueryBuilder(ServiceOrder.find(baseFilter), query)
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

const getMyMonthlyServiceStats = async (serviceProviderId: string, year: number) => {
  // Ensure valid ObjectId
  const providerObjectId = new mongoose.Types.ObjectId(serviceProviderId);

  // Aggregate service orders for a given provider and year
  const result = await ServiceOrder.aggregate([
    {
      $match: {
        serviceProviderId: providerObjectId,
        isDeleted: false,
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.month",
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id",
        pending: {
          $ifNull: [
            {
              $first: {
                $filter: {
                  input: "$statuses",
                  as: "s",
                  cond: { $eq: ["$$s.status", "pending"] },
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
        pending: "$pending.count",
        completed: "$completed.count",
      },
    },
    {
      $sort: { month: 1 },
    },
  ]);

  // Ensure all months (1-12) are included with 0 counts if missing
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthData = result.find((r) => r.month === i + 1);
    return {
      month: i + 1,
      pending: monthData?.pending || 0,
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

  // Base filter: only orders assigned to this technician
  const baseFilter = {
    isDeleted: false,
    serviceProviderId: userId,
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
  acceptServiceOrder,
  deleteServiceOrder,
};
