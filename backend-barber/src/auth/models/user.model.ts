import mongoose, { Document } from 'mongoose'
const { Schema } = mongoose
import { IUserInput } from '../types/user';

export interface IUser extends Document, IUserInput {
  role: 'cliente' | 'empleado' | 'admin'
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  phone: { type: String, required: false, unique: true, sparse: true },
  role: { 
    type: String, 
    enum: ['cliente', 'empleado', 'admin'],
    default: 'cliente'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  googleId: { type: String },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date }
})

const User = mongoose.model<IUser>("User", userSchema)
export default User;