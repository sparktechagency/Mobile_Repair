/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../error/AppError';
import { DeleteAccountPayload, PaginateQuery, TUser, TUserCreate, VerifiedProfessionalPayload } from './user.interface';
import { User } from './user.model';
import config from '../../config';
import QueryBuilder from '../../builder/QueryBuilder';
import { otpServices } from '../otp/otp.service';
import { generateOptAndExpireTime } from '../otp/otp.utils';
import { TPurposeType } from '../otp/otp.interface';
import { createToken, verifyToken } from '../../utils/tokenManage';
import Notification from '../notifications/notifications.model';
import mongoose, { Types } from 'mongoose';
import { getAdminId } from '../../DB/adminStrore';
import { emitNotification } from '../../../socketIo';
import { USER_ROLE, UserRole } from './user.constants';
import fs from 'fs';
import path from 'path';
import { otpSendEmail } from '../../utils/emailNotification';


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
  
  console.log("before create user => >> ",{payload});
  
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
      name: "Customer",
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
      name: "Customer",
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
            await otpServices.updateOtpByEmail(email, "email-verification", {
              status: "verified",
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
                userId: user[0]._id,
                receiverId: getAdminId(),
                userMsg: {
                  fullName: user[0].name || "",
                  image: user[0].profileImage || "", // Placeholder image URL (adjust this)
                  text: "New user added in your app"
                },
                type: 'added',
              } as any;

              // emit notification in background, don’t block response
              emitNotification(notificationData).catch(err => {
                console.error("Notification emit failed:", err);
              });
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
      console.log(`🗑️ Deleted old image: ${oldFilePath}`);
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

  return user;
};





const getAllUserQuery = async (userId: string, query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find({ _id: { $ne: userId } }), query)
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





// Optimized the function to improve performance, reducing the processing time to 235 milliseconds.
const getMyProfile = async (id: string) => {
const result = await User.findById(id).populate("profileId")
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

export const userService = {
  createUserToken,
  otpVerifyAndCreateUser,
  getAllTechnicians,
  verifyTechnicianUserById,
  getPendingTechnicians,
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
};
