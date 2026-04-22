import express from 'express'
import { registerSchema } from '../validator/auth.validator'
import { register } from '../controllers/auth.controller'
import { validate } from '../middlewares/auth.middleware'



const router = express.Router({mergeParams:true})

router.post("/register", validate({body: registerSchema}), register)
export default router