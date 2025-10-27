import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { userService } from './user.service';

import httpStatus from 'http-status';
import { storeFile, storeFiles } from '../../utils/fileHelper';


const createUser = catchAsync(async (req: Request, res: Response) => {

  const createUserToken = await userService.createUserToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Check email for OTP',
    data:  createUserToken ,
  });
});

const userCreateVarification = catchAsync(async (req, res) => {
  const token = req.headers?.token as string;

  console.log({token})

  const { otp } = req.body;
  const newUser = await userService.otpVerifyAndCreateUser({ otp, token });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User create successfully',
    data: newUser,
  });
});

const verifyTechnicianUserById = catchAsync(
  async (req: Request, res: Response) => {
    // Extract userId from params and status from request body
    const { userId } = req.params;

    const updatedUser = userService.verifyTechnicianUserById(userId);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: `User has been verified successfully`,
      data: updatedUser,
    });
  }
);

const declineTechnicianUserById = catchAsync(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { reason } = req.body; // Optional reason for declining

    const declinedUser = userService.declineTechnicianUserById(userId, reason);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Professional user has been declined successfully',
      data: declinedUser,
    });
  }
);

// rest >...............


const getAllUsers = catchAsync(async (req, res) => {
  const {userId} = req.user;
  const result = await userService.getAllUserQuery(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    meta: result.meta,
    data: result.result,
    message: 'Users All are requered successful!!',
  });
});



const getMyProfile = catchAsync(async (req: Request, res: Response) => {

  const result = await userService.getMyProfile(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile fetched successfully',
    data: result,
  });
});

const getAdminProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAdminProfile(req?.user?.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile fetched successfully',
    data: result,
  });
});



const getPendingTechnicians = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, ...rest } = req.query;

  const query = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    ...rest
  };

  const result = await userService.getPendingTechnicians(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional photographers and videographers retrieved successfully",
    data: result,
  });
});

const getAllTechnicians = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, ...rest } = req.query;

  const query = {
    page: Number(page) || 1,
    limit: Number(limit) || 10,
    ...rest
  };

  const result = await userService.getAllTechnicians(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Professional photographers and videographers retrieved successfully",
    data: result,
  });
});




const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  

  // console.log("udpate profile body data =>>>>> ",req.body)
  if (req?.file) {
    // console.log("req file =>>>> ",req.file)
    req.body.profileImage = storeFile('profile', req?.file?.filename);
  }


  const result = await userService.updateUser(req?.user?.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'profile updated successfully',
    data: result,
  });
});

const blockedUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.blockedUser(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User ${result.status ? 'blocked': 'unBlocked'} successfully`,
    data: result.user,
  });
});

const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.deleteMyAccount(req.user?.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User deleted successfully',
    data: result,
  });
});

export const userController = {
  createUser,
  userCreateVarification,
  getMyProfile,
  getAdminProfile,
  updateMyProfile,
  blockedUser,
  deleteMyAccount,
  getAllUsers,
  getAllTechnicians,
  getPendingTechnicians,
  verifyTechnicianUserById,
  declineTechnicianUserById,
};
