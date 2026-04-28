import { Types } from "mongoose";
import { IUserInput } from "../types/user";
import { Barber, RegisteredClient } from "../models/user.model";

export const saveUserService = async (newUser: IUserInput) => {
    const user = new RegisteredClient(newUser);
    await user.save();
    return;
};

export const findByEmail = async (email: string) => {
    const barber = await Barber.findOne({ email });
    if (barber) {
        return barber;
    }
    return RegisteredClient.findOne({ email });
};

export const updatePassword = async (userId: string | Types.ObjectId, passwordHash: string) => {
    const barber = await Barber.findByIdAndUpdate(userId, { password: passwordHash });
    if (barber) {
        return barber;
    }
    return RegisteredClient.findByIdAndUpdate(userId, { password: passwordHash });
};