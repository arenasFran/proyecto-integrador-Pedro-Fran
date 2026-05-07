import express from 'express'
import { register } from '../controllers/auth.controller'
import { requestReset, resetPassword } from '../controllers/recovery.controller'
import { validate } from '../middlewares/auth.middleware'
import { registerSchema } from '../validator/auth.validator'
import { requestResetSchema, resetPasswordSchema } from '../validator/recovery.validator'

const router = express.Router({mergeParams:true})

router.post("/register", validate({body: registerSchema}), register)
router.post('/request-reset', validate({ body: requestResetSchema }), requestReset)
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword)

export default router