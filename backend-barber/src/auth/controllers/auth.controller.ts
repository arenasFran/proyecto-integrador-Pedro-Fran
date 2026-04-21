import { Request, Response } from "express";
import { Jwt } from "jsonwebtoken";
import bycript from "bcrypt";
import { saveUserService } from "../services/users.services";
import User from "../models/user.model";


export const register = async (req: Request, res: Response) => {
    try{
        const {email, password, name,lastname, phone} = req.body;

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(409).json({error: 'Email en uso.'})
        }
        const hash = bycript.hashSync(password, 10);

        const data = {
            email,
            password: hash,
            name,
            lastname,
            phone
        }

        const newUser = await saveUserService(data)
        res.status(201).json({message: 'Usuario registrado con éxito'})
    }
    catch(error){
        res.status(500).json({error: 'Error al registrar al usuario'})
    }
   
}