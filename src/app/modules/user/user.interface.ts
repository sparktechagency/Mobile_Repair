import { Model, ObjectId, Schema } from 'mongoose';


export interface TUserCreate {
  name?: string;
  email: string;
  password: string;
  profileImage: string;
  role: string;
  phone: string;
  address?: string;
  yearOfExperience: number;
  specialties: string;
  adminVerified: string;
  isBlocked: boolean;
  isDeleted: boolean;
  acceptTerms: boolean;
}

export interface TUser extends TUserCreate {
  _id: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface UserModel extends Model<TUser> {
  isUserExist(email: string): Promise<TUser>;
  
  isUserActive(email: string): Promise<TUser>;

  IsUserExistById(id: string): Promise<TUser>;

  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
}

export type IPaginationOption = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};


export interface PaginateQuery {
  role?: string;
  categoryName?: string;
  page?: number;
  limit?: number;
}

export interface VerifiedProfessionalPayload {
  userId: string;
  status: 'pending' | 'verified';
}

export interface CreateSuperAdminProps {
  name: string;
  email: string;
  phone: string;
  password: string;
}