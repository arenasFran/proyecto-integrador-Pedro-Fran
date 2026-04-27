import express from 'express'
import { googleLoginSchema, loginSchema, registerSchema, twoFactorSendSchema, twoFactorVerifySchema} from '../validator/auth.validator'
import { register } from '../controllers/auth.controller'
import { validate } from '../middlewares/auth.middleware'
import { googleLogin } from '../controllers/auth.google.controller'
import { sendTwoFactorCode, verifyTwoFactorCode } from '../controllers/auth.2fa.controller'


const router = express.Router({mergeParams:true})

router.post("/register", validate({body: registerSchema}), register)
router.post('/google', validate({ body: googleLoginSchema }), googleLogin)
router.post('/2fa/send', validate({ body: twoFactorSendSchema }), sendTwoFactorCode)
router.post('/2fa/verify', validate({ body: twoFactorVerifySchema }), verifyTwoFactorCode)
export default router