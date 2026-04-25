import express from 'express'
import { loginSchema, registerSchema } from '../validator/auth.validator'
import { login, register } from '../controllers/auth.controller'
import { validate } from '../middlewares/auth.middleware'



const router = express.Router({mergeParams:true})

router.post("/register", validate({body: registerSchema}), register)
router.post('/login',validate({body:loginSchema}), login);
export default router