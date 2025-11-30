import { Router } from 'express';
import auth from '../../middleware/auth';
import fileUpload from '../../middleware/fileUpload';
import parseData from '../../middleware/parseData';
import validateRequest from '../../middleware/validateRequest';
import { verifyOtpValidations } from '../otp/otp.validation';
import { userController } from './user.controller';
import { userValidation } from './user.validation';
import { USER_ROLE } from './user.constants';
const upload = fileUpload('./public/uploads/profile');

export const userRoutes = Router();

userRoutes
  .post(
    '/create',
    validateRequest(userValidation?.userValidationSchema),
    userController.createUser,
  )

  .post(
    '/create-user-verify-otp',
    validateRequest(verifyOtpValidations.verifyOtpZodSchema),
    userController.userCreateVarification,
  )

  .post(
    "/create-superadmin",
    auth(USER_ROLE.ADMIN),
    userController.createSuperAdmin
  )


  .get(
    '/my-profile',
    auth(
      USER_ROLE.TECHNICIAN,USER_ROLE.SUPERADMIN, USER_ROLE.ADMIN,
    ),
    userController.getMyProfile,
  )

  .get(
    '/admin-profile',
    auth(
      'admin'
    ),
    userController.getAdminProfile,
  )

  .get('/all-users', auth("admin"), userController.getAllUsers)

  .get(
    "/super_admins",
    auth(USER_ROLE.ADMIN),
    userController.getAllSuperAdmins
  )

  .get(
    '/technicians',
    userController.getAllTechnicians
  )

  .get(
    '/pending-technicians',
    // auth(USER_ROLE.ADMIN),  
    userController.getPendingTechnicians
  )


  .get(
    "/total-statistics",
    userController.getTotalStatistics
  )

  .get(
    '/monthly-statistics',
    userController.getMonthlyStatistics
  )
 

  .patch(
    '/update-my-profile',
    auth(USER_ROLE.TECHNICIAN, USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
    upload.single('image'),
    parseData(),
    userController.updateMyProfile,
  )

  .patch(
    '/update-super-admin-profile/:superAdminId',
    auth(USER_ROLE.ADMIN),
    userController.updateSuperAdminByAdmin
  )

  .patch(
    '/verified/:userId',
    auth(USER_ROLE.ADMIN),
    userController.verifyTechnicianUserById,
  )

  .patch(
    '/declined/:userId',
    auth('admin'),
    userController.declineTechnicianUserById,
  )
  
  .patch(
    '/block/:id',
    auth('admin'),
    userController.blockedUser,
  )
  
  .delete(
    '/delete-my-account',
    auth('user'
    ),
    userController.deleteMyAccount,
  )

  .delete(
    '/delete-user/:id',
    auth(USER_ROLE.ADMIN, USER_ROLE.SUPERADMIN),
    userController.deletedUserById
  );

// export default userRoutes;
