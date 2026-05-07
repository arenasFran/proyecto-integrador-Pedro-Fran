import { Types } from 'mongoose';
import User from "../models/user.model";
import { IUserInput } from "../types/user";

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

export default { saveUserService, findByEmail, updatePassword }