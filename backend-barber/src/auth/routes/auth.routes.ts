import express from 'express'
import { loginSchema, registerSchema } from '../validator/auth.validator'
import { login, register } from '../controllers/auth.controller'
import { validate } from '../middlewares/auth.middleware'
import { googleLogin } from '../controllers/auth.google.controller'



const router = express.Router({mergeParams:true})

router.post("/register", validate({body: registerSchema}), register)
router.post('/login',validate({body:loginSchema}), login);
router.post('/google', googleLogin)
export default router