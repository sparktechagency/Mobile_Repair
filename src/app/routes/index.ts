import { Router } from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { otpRoutes } from "../modules/otp/otp.routes";
import { settingsRoutes } from "../modules/setting/setting.route";
import { notificationRoutes } from "../modules/notifications/notifications.route";
import { ServiceOrderRoutes } from "../modules/serviceOrder/serviceOrder.route";
import { managePriceRoutes } from "../modules/managePrice/managePrice.route";
import path from "path";
import { manageLocationRoutes } from "../modules/manageLocation/manageLocation.route";

const router = Router();

const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: "/otp",
    route: otpRoutes
  },
  {
    path: "/settings",
    route: settingsRoutes
  },
  {
     path: "/notifications",
     route: notificationRoutes
  },
  {
     path: "/managePrice",
     route: managePriceRoutes
  },
  {
     path: "/serviceOrder",
     route: ServiceOrderRoutes
  },

  {
    path: "/manage_location",
    route: manageLocationRoutes
  }

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;