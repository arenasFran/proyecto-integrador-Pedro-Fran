import { Types } from "mongoose";
import { IUserInput } from "../types/user";
import User from "../models/user.model"

export const saveUserService = async (newUser: IUserInput)=>{
    const user = new User(newUser)
    await user.save();
    return;
}

export const findByEmail = async (email: string) => {
    return User.findOne({ email });
}

export const updatePassword = async (userId: string | Types.ObjectId, passwordHash: string) => {
    return User.findByIdAndUpdate(userId, { password: passwordHash });
}