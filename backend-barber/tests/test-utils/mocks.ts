export const makeMockUserRepository = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByPhone: jest.fn(),
  createRegisteredClient: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
  updateTwoFactor: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUserSecurity: jest.fn(),
});

export const makeMockTempLockRepository = () => ({
  create: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteById: jest.fn(),
  findByBarberAndDate: jest.fn(),
  findById: jest.fn(),
});

export const makeMockAppointmentRepository = () => ({
  findById: jest.fn(),
  findMany: jest.fn(),
  findByBarberAndDate: jest.fn(),
  findByClientAndDate: jest.fn(),
  findByContactAndDate: jest.fn(),
  findByClientId: jest.fn(),
  findByContact: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateClientId: jest.fn(),
  updateStatus: jest.fn(),
});

export const makeMockTokenService = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  signPartialToken: jest.fn(),
  verifyPartialToken: jest.fn(),
});

export const makeMockRefreshTokenRepository = () => ({
  create: jest.fn(),
  findByTokenHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllByUserId: jest.fn(),
});

export const makeMockPasswordHasher = () => ({
  hash: jest.fn(),
  compare: jest.fn(),
});

export const makeMockEmailService = () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
});

export const makeMockMembershipRepository = () => ({
  findActiveByUser: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findByPreapprovalId: jest.fn(),
  save: jest.fn(),
  hasActiveMembership: jest.fn(),
  expireExpiredMemberships: jest.fn(),
});

export const makeMockHashService = () => ({
  sha256: jest.fn(),
  constantTimeEqual: jest.fn(),
});

export const makeMockGoogleAuthService = () => ({
  verifyIdToken: jest.fn(),
});

export const makeMockBarberRepository = () => ({
  findBarberById: jest.fn(),
  findAllBarbers: jest.fn(),
  findAllBarbersPaginated: jest.fn(),
  createBarber: jest.fn(),
  updateBarber: jest.fn(),
  deactivateBarber: jest.fn(),
  deleteBarber: jest.fn(),
  updateSchedule: jest.fn(),
});

export const makeMockServiceRepository = () => ({
  findAll: jest.fn(),
  findAllAdmin: jest.fn(),
  findById: jest.fn(),
  findByIdIncludingInactive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  restore: jest.fn(),
});

export const makeMockClientRepository = () => ({
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findByBoth: jest.fn(),
  createUnregistered: jest.fn(),
});

export const makeMockBarberBlockRepository = () => ({
  findByBarberAndDate: jest.fn(),
  findByBarberAndDateRange: jest.fn(),
  create: jest.fn(),
  deleteById: jest.fn(),
  deleteByBarberId: jest.fn(),
  findByDateRange: jest.fn(),
  findById: jest.fn(),
});

export const makeMockPasswordResetRepository = () => ({
  create: jest.fn(),
  verifyAndConsume: jest.fn(),
});

export const makeMockPaymentRepository = () => ({
  findById: jest.fn(),
  findByMpPreferenceId: jest.fn(),
  findByMpPaymentId: jest.fn(),
  findByReference: jest.fn(),
  findByUser: jest.fn(),
  save: jest.fn(),
  cancelPendingByAppointments: jest.fn(),
});

export const makeMockPaymentService = () => ({
  createPreference: jest.fn(),
  getPayment: jest.fn(),
  validateWebhookSignature: jest.fn(),
  createPreapproval: jest.fn(),
  getPreapproval: jest.fn(),
  cancelPreapproval: jest.fn(),
});

export const makeMockOrderRepository = () => ({
  findById: jest.fn(),
  findByUser: jest.fn(),
  findByUserId: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  updateStatus: jest.fn(),
});

export const makeMockProductRepository = () => ({
  findById: jest.fn(),
  findByIds: jest.fn(),
  findAll: jest.fn(),
  findByCategory: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  atomicDecreaseStock: jest.fn(),
});
