import { Types } from "mongoose";
import { IUserInput } from "../types/user";
import { Barber, RegisteredClient } from "../models/user.model";
import bcrypt from "bcrypt";

export const saveUserService = async (newUser: IUserInput) => {
    const user = new RegisteredClient(newUser);
    await user.save();
    return;
};

export const findUserByEmail = async (email: string) => {
    const barber = await Barber.findOne({ email });
    if (barber) {
        return barber;
    }
    return RegisteredClient.findOne({ email });
};

export const validatePassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

export const updatePassword = async (userId: string | Types.ObjectId, passwordHash: string) => {
    const barber = await Barber.findByIdAndUpdate(userId, { password: passwordHash });
    if (barber) {
        return barber;
    }
    return RegisteredClient.findByIdAndUpdate(userId, { password: passwordHash });
};

// Backward-compatible alias from develop branch naming.
export const findByEmail = findUserByEmail;

export default { saveUserService, findUserByEmail, findByEmail, validatePassword, updatePassword };
