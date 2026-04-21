import mongoose, {Document} from 'mongoose'
const {Schema} = mongoose
import { IUserInput } from '../types/user'; 

export interface IUser extends Document,IUserInput {}


const userSchema = new Schema<IUser>({
    email: {type:String, required:true, unique:true},
    password: {type:String, required:true},
    name: {type:String, required:true},
    lastname: {type:String, required:true},
    phone: {type:String, required:true, unique:true},
})

const User = mongoose.model<IUser>("User", userSchema)
export default User;