import { IUserInput } from "../types/user";
import User from "../models/user.model"

export const saveUserService = async (newUser: IUserInput)=>{
    const user = new User(newUser)
    await user.save();
    return;
}