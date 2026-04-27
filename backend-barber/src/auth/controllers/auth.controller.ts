import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { saveUserService } from "../services/users.services";


export const register = async (req: Request, res: Response) => {
    try{
        const {email, password, name, lastname, phone} = req.body;

        const hash = await bcrypt.hash(password, 10);

        const data = {
            email,
            password: hash,
            name,
            lastname,
            phone
        }

        await saveUserService(data)
        res.status(201).json({message: 'Usuario registrado con éxito'})
    }
    catch(error: any){
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue ?? {})[0];
            const message = field === 'phone' ? 'Teléfono en uso.' : 'Email en uso.';
            return res.status(409).json({ error: message });
        }
        res.status(500).json({error: 'Error al registrar al usuario'})
    }
   
}