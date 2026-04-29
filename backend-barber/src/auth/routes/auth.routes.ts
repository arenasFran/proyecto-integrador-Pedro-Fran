import express from 'express'
import { googleLoginSchema, loginSchema, registerSchema, twoFactorSendSchema, twoFactorVerifySchema } from '../validator/auth.validator'
import { requestResetSchema, resetPasswordSchema } from '../validator/recovery.validator'
import { register, login } from '../controllers/auth.controller'
import { validate } from '../middlewares/auth.middleware'
import { googleLogin } from '../controllers/auth.google.controller'
import { sendTwoFactorCode, verifyTwoFactorCode } from '../controllers/auth.2fa.controller'
import { requestReset, resetPassword } from '../controllers/recovery.controller'

const router = express.Router({ mergeParams: true })

// Register and Login routes
router.post("/register", validate({ body: registerSchema }), register)
router.post("/login", validate({ body: loginSchema }), login)
router.post('/google', validate({ body: googleLoginSchema }), googleLogin)

// Two-Factor Authentication routes
router.post('/2fa/send', validate({ body: twoFactorSendSchema }), sendTwoFactorCode)
router.post('/2fa/verify', validate({ body: twoFactorVerifySchema }), verifyTwoFactorCode)

// Password Reset routes
router.post('/request-reset', validate({ body: requestResetSchema }), requestReset)
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword)

export default router
