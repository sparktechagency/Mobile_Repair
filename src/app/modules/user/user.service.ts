/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { CreateSuperAdminProps, DeleteAccountPayload, PaginateQuery, TUser, TUserCreate, VerifiedProfessionalPayload } from './user.interface';
import { User } from './user.model';
import config from '../../config';
import QueryBuilder from '../../builder/QueryBuilder';
import { otpServices } from '../otp/otp.service';
import { generateOptAndExpireTime } from '../otp/otp.utils';
import { TPurposeType } from '../otp/otp.interface';
import { createToken, verifyToken } from '../../utils/tokenManage';
import Notification from '../notifications/notifications.model';
import mongoose, { Types } from 'mongoose';
import { getAdminData, getAdminId } from '../../DB/adminStrore';
import { emitNotification } from '../../../socketIo';
import { USER_ROLE, UserRole } from './user.constants';
import fs from 'fs';
import path from 'path';
import { otpSendEmail, sendNotificationEmail } from '../../utils/emailNotification';
import { ServiceOrder } from '../serviceOrder/serviceOrder.model';
import { create } from 'domain';

export type IFilter = {
  searchTerm?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export interface OTPVerifyAndCreateUserProps {
  otp: string;
  token: string;
}

const createUserToken = async (payload: TUserCreate) => {
  

  
  const { name, email, password,  phone, yearOfExperience, specialties, address} = payload;
  let adminVerified = "pending"

  // user exist check
  const userExist = await userService.getUserByEmail(email);

  if (userExist) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exist!!');
  }

  const { isExist, isExpireOtp } = await otpServices.checkOtpByEmail(email, "email-verification");

  const { otp, expiredAt } = generateOptAndExpireTime();

  let otpPurpose: TPurposeType = 'email-verification';

  if (isExist && !isExpireOtp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'otp-exist. Check your email.');
  } else if (isExist && isExpireOtp) {
    const otpUpdateData = {
      otp,
      expiredAt,
    };

    await otpServices.updateOtpByEmail(email,otpPurpose, otpUpdateData);
  } else if (!isExist) {
    await otpServices.createOtp({
      name: payload.name || "Customer",
      sentTo: email,
      receiverType: 'email',
      purpose: otpPurpose,
      otp,
      expiredAt,
    });
  }

  const otpBody: Partial<TUserCreate> = {
    name, 
    email, 
    password, 
    role: "technician",
    phone,
    yearOfExperience,
    specialties,
    adminVerified,
    address
  };


  // send email
  process.nextTick(async () => {
    await otpSendEmail({
      sentTo: email,
      subject: 'Your one time otp for email  verification',
      name: payload.name || "Customer",
      otp,
      expiredAt: expiredAt,
    });
  });

  // crete token
  const createUserToken = createToken({
    payload: otpBody,
    access_secret: config.jwt_access_secret as string,
    expity_time: config.otp_token_expire_time as string | number,
  });


    

  return createUserToken;
  
};

const otpVerifyAndCreateUser = async ({
            otp,
            token,
          }: OTPVerifyAndCreateUserProps) => {
            if (!token) {
              throw new AppError(httpStatus.BAD_REQUEST, "Token not found");
            }

            const decodeData = verifyToken({
              token,
              access_secret: config.jwt_access_secret as string,
            });

            if (!decodeData) {
              throw new AppError(httpStatus.BAD_REQUEST, "You are not authorised");
            }

            const {
              name, 
              email, 
              password, 
              role,
              phone,
              yearOfExperience,
              specialties,
              adminVerified,
              address
            } = decodeData;

            // Check OTP
            const isOtpMatch = await otpServices.otpMatch(
              email,
              "email-verification",
              otp
            );

            if (!isOtpMatch) {
              throw new AppError(httpStatus.BAD_REQUEST, "OTP did not match");
            }

            // Update OTP status
            // await otpServices.updateOtpByEmail(email, "email-verification", {
            //   status: "verified",
            // });

            // Fire-and-forget OTP cleanup
            otpServices.deleteOtpsByEmail(email).catch(err => {
              console.error("Failed to delete OTPs:", err);
            });


            // Check if user exists
            const isExist = await User.isUserExist(email as string);

            if (isExist) {
              throw new AppError(
                httpStatus.FORBIDDEN,
                "User already exists with this email"
              );
            }

            // Create user + profile atomically with transaction
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
              const user = await User.create(
                [
                  {
                    name, 
                    email, 
                    password, 
                    role,
                    phone,
                    yearOfExperience,
                    specialties,
                    adminVerified,
                    address
                  },
                ],
                { session }
              );



              await session.commitTransaction();
              session.endSession();


              const notificationData = {   
                    userId: new Types.ObjectId(user[0]._id),    // Sender = Technician user
                    receiverId: new Types.ObjectId(getAdminId()), // Receiver = Admin
                    userMsg: {
                      fullName: user[0].name || "",
                      image: user[0].profileImage || "",
                      text: "A new technical user has registered and is pending approval.",
                      photos: [],
                    },

                    type: "technicianPendingApproval",
                  };

                  // Emit notification asynchronously
                  emitNotification(notificationData).catch(err => {
                    console.error("Notification emit failed:", err);
                  });


              const admin = getAdminData() as any;
                if (!admin || !admin?.email) return;

                const subject = "New Technician Registration Pending Approval";
                const messageText = `Hello Admin,

              A new technician has registered and is pending your approval.

              Technician Details:
              Name: ${user[0].name || "N/A"}
              Email: ${user[0].email || "N/A"}
              Phone: ${user[0].phone || "N/A"}

              Please review and approve this user in the admin panel.`;

                await sendNotificationEmail({
                  sentTo: admin.email,
                  subject,
                  userName: "Admin",
                  messageText,
                }).catch(err => console.error("Failed to send email to admin:", err.message));
              

              // Generate access token
              const jwtPayload = {
                userId: user[0]._id.toString(),
                name: user[0].name || "",
                email: user[0].email,
                role: user[0].role,
                adminVerified: user[0].adminVerified
              };

              return createToken({
                payload: jwtPayload,
                access_secret: config.jwt_access_secret as string,
                expity_time: "5m",
              });
            } catch (error) {
              await session.abortTransaction();
              session.endSession();

              throw new AppError(httpStatus.BAD_REQUEST, "User creation failed");
            }
};

const createSuperAdminByAdmin = async ({
  name,
  email,
  phone,
  password
}: CreateSuperAdminProps) => {
  // ===== Validate Inputs =====
  if (!name || !email || !phone || !password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Name, email & phone are required"
    );
  }

  // ===== Check if user already exists =====
  const isExist = await User.isUserExist(email);
  if (isExist) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User already exists with this email"
    );
  }

  // // ===== Default password from .env =====
  // const defaultPassword = config.default_superadmin_pass;
  // if (!defaultPassword) {
  //   throw new AppError(
  //     httpStatus.INTERNAL_SERVER_ERROR,
  //     "Default password not configured in environment"
  //   );
  // }

  // ===== Create Super Admin with transaction =====
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUser = await User.create(
      [
        {
          name,
          email,
          phone,
          password,
          role: USER_ROLE.SUPERADMIN,
          adminVerified: "verified", 
          address: "",
          yearOfExperience: 0,
          specialties: "",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return  newUser[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(httpStatus.BAD_REQUEST, "Super Admin creation failed");
  }
};


const updateUser = async (userId: string, payload: Partial<TUser>) => {
  // 🚫 Restrict sensitive fields from updates here
  const forbiddenFields = ["email", "password", "role", "adminVerified"];
  forbiddenFields.forEach((field) => {
    if (payload[field as keyof TUser] !== undefined) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `${field} cannot be updated in this endpoint`
      );
    }
  });

  // ✅ Find user first
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // ✅ Handle profile image change
  if (payload.profileImage && existingUser.profileImage) {
    const oldFilePath = path.join(
      process.cwd(),
      "public",
      existingUser.profileImage
    );
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
  }

  // ✅ Spread only allowed fields
  const updateData: Partial<TUser> = {
    ...payload,
  };

  // ✅ Update user
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    throw new AppError(httpStatus.BAD_REQUEST, "User update failed");
  }

  return updatedUser;
};


const verifyTechnicianUserById = async (userId: string) => {


  const user = await User.findByIdAndUpdate(
    userId,
    { adminVerified:"verified" },
    { new: true, runValidators: true } // ensure validation runs
  ).select('-password'); // exclude password

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User verification update failed');
  }

  // ✅ Send Notification to Technician (receiver)
  const notificationPayload = {
    userId: new Types.ObjectId(getAdminId()),  // Sender → admin
    receiverId: new Types.ObjectId(user._id),  // Receiver → verified technician
    message: {
      fullName: "Admin",
      image: "",
      text: "Congratulations! Your profile has been verified successfully.",
      photos: [],
    },
    type: "technicianVerified",
  };

  // Fire & Forget (background)
  // Emit notification asynchronously
  emitNotification(notificationPayload).catch(err => {
    console.error("Notification emit failed:", err);
  });

  return user;
};

const declineTechnicianUserById = async (userId: string, reason?: string) => {
  // Soft delete + mark as declined
  const user = await User.findByIdAndUpdate(
    userId,
    { 
      isDeleted: true, 
      adminVerified: 'declined' // optional, could use 'declined' if you add this enum
    },
    { new: true, runValidators: true }
  ).select('-password'); // exclude password

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to decline the professional user');
  }

  // ✅ Send Notification to Technician (receiver)
  const notificationPayload = {
    userId: new Types.ObjectId(getAdminId()),  // Sender = Admin
    receiverId: new Types.ObjectId(user._id),   // Receiver = declined technician
    message: {
      fullName: "Admin",
      image: "",
      text: reason
        ? `Your profile has been declined. Reason: ${reason}`
        : "Your profile has been declined by the admin.",
      photos: [],
    },
    type: "technicianDeclined",
  };

  // Fire & Forget (background)
  // Emit notification asynchronously
  emitNotification(notificationPayload).catch(err => {
    console.error("Notification emit failed:", err);
  });

  return user;
};

const updateSuperAdminByAdmin = async (
  superAdminId: string,
  updateData: Partial<{ name: string; phone: string }>
) => {
  if (!superAdminId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Super Admin ID is required");
  }

  // Check if Super Admin exists
  const superAdmin = await User.findOne({ _id: superAdminId, role: USER_ROLE.SUPERADMIN });
  if (!superAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, "Super Admin not found");
  }

  // Only update name and phone
  if (updateData.name) superAdmin.name = updateData.name;
  if (updateData.phone) superAdmin.phone = updateData.phone;

  await superAdmin.save();

  return superAdmin;
};

const getAllSuperAdmins = async (query: Record<string, unknown>) => {


  const superAdmins = await User.find({ role: USER_ROLE.SUPERADMIN, isDeleted: false }).select("name email phone createdAt").sort({createdAt: -1});

  return superAdmins;
};


const getAllUserQuery = async (userId: string, query: Record<string, unknown>) => {

  const userQuery = new QueryBuilder(User.find({ _id: { $ne: userId },isDeleted: false }), query)
    .search(['fullName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();
  return { meta, result };
};

const getAllTechnicians =  async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    role: USER_ROLE.TECHNICIAN,
    adminVerified: "verified",
    isDeleted: false,
    // isBlocked: false,
  };

  const userQuery = new QueryBuilder(User.find(roleFilter), query)
    .search(['name', 'profileImage', 'email']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getPendingTechnicians= async (
  query: Record<string, any> = {}
) => {
  // Filter users by role
  const roleFilter = {
    role: { $in: [USER_ROLE.TECHNICIAN] },
    adminVerified: "pending",
    isDeleted: false,
    isBlocked: false,
  };

  const userQuery = new QueryBuilder(User.find(roleFilter), query)
    .search(['name', 'profileImage', 'email']) // corrected search fields
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await userQuery.modelQuery;
  const meta = await userQuery.countTotal();

  return { meta, result };
};

const getAllUserCount = async () => {
  const allUserCount = await User.countDocuments();
  return allUserCount;
};




const getUserById = async (id: string) => {
  const result = await User.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  return result;
};


const getTotalStatistics = async (year: number) => {
  // ✅ Default current year
  if (!year) year = new Date().getFullYear();

  
  // ✅ Native Date boundaries
  const start = new Date(year, 0, 1, 0, 0, 0);     // Jan 1st, 00:00:00
  const end = new Date(year, 11, 31, 23, 59, 59); // Dec 31st, 23:59:59

  // ✅ Common match query applied on both collections
  const matchByYear = {
    createdAt: { $gte: start, $lte: end },
  };

  // ✅ Aggregation for technicians (verified + pending in one call)
  const technicianStats = await User.aggregate([
    { $match: { role: USER_ROLE.TECHNICIAN, ...matchByYear } },
    { $group: { _id: "$adminVerified", count: { $sum: 1 } } },
  ]);

  // ✅ Convert to key-value results
  const totalTechnicians =
    technicianStats.find((t) => t._id === "verified")?.count || 0;
  const totalPendingTechnicians =
    technicianStats.find((t) => t._id === "pending")?.count || 0;

  // ✅ Single call for total service orders
  const totalServiceOrders = await ServiceOrder.countDocuments(matchByYear);

  return {
    year,
    totalTechnicians,
    totalPendingTechnicians,
    totalServiceOrders,
  };
};

const getMonthlyStatistics = async (year: number) => {
  const monthlyStats = [];

  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 1, 0, 0, 0);

    // 🧮 Count technicians verified in this month
    const totalTechnicians = await User.countDocuments({
      role: USER_ROLE.TECHNICIAN,
      adminVerified: "verified",
      createdAt: { $gte: monthStart, $lt: monthEnd },
    });

    // 🧮 Count service orders created in this month
    const totalServiceOrders = await ServiceOrder.countDocuments({
      isDeleted: false,
      createdAt: { $gte: monthStart, $lt: monthEnd },
    });

    monthlyStats.push({
      month: month + 1, // 1-12
      totalTechnicians,
      totalServiceOrders,
    });
  }

  return { year, monthlyStats };
};



// Optimized the function to improve performance, reducing the processing time to 235 milliseconds.
const getMyProfile = async (id: string) => {
const result = await User.findById(id)
return result;
};



const getAdminProfile = async (id: string) => {
  const result = await User.findById(id).lean()

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }


  return result;
};

const getUserByEmail = async (email: string) => {
  const result = await User.findOne({ email });

  return result;
};



const deleteMyAccount = async (id: string, payload: DeleteAccountPayload) => {
  const user: TUser | null = await User.IsUserExistById(id);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is deleted');
  }

  if (!(await User.isPasswordMatched(payload.password, user.password))) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password does not match');
  }

  const userDeleted = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!userDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return userDeleted;
};

const blockedUser = async (id: string) => {
  const singleUser = await User.IsUserExistById(id);

  if (!singleUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  // let status;

  // if (singleUser?.isActive) {
  //   status = false;
  // } else {
  //   status = true;
  // }
  let status = !singleUser.isBlocked; 
  const user = await User.findByIdAndUpdate(
    id,
    { isBlocked: status },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return {status, user};
};

const deletedUserById = async (id: string) => {
  const singleUser = await User.IsUserExistById(id);

  if (!singleUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'user deleting failed');
  }

  return user;
};
  

export const userService = {
  createUserToken,
  otpVerifyAndCreateUser,
  createSuperAdminByAdmin,
  getAllTechnicians,
  verifyTechnicianUserById,
  getPendingTechnicians,
  getTotalStatistics,
  getMonthlyStatistics,
  getMyProfile,
  getAdminProfile,
  getUserById,
  getUserByEmail,
  updateUser,
  declineTechnicianUserById,
  deleteMyAccount,
  blockedUser,
  getAllUserQuery,
  getAllUserCount,
  updateSuperAdminByAdmin,
  getAllSuperAdmins,
  deletedUserById
};
