import mongoose, { Document } from 'mongoose'
const { Schema } = mongoose
import { IUserInput } from '../types/user';

export interface IUser extends Document, IUserInput {
  role: 'cliente' |'empleado' | 'admin'
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['cliente','empleado', 'admin'],
    default: 'cliente'
  }
})

const User = mongoose.model<IUser>("User", userSchema)
export default User;