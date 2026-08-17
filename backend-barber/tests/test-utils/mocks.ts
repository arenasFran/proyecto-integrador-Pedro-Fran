export const makeMockUserRepository = () => ({
  findByIds: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByPhone: jest.fn(),
  createRegisteredClient: jest.fn(),
  update: jest.fn(),
  updatePassword: jest.fn(),
  updateTwoFactor: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUserSecurity: jest.fn(),
  findEmailById: jest.fn().mockResolvedValue(null),
  findRegisteredClients: jest.fn().mockResolvedValue([]),
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
  getSummary: jest.fn().mockResolvedValue({ total: 0, completed: 0, cancelled: 0 }),
  cancelPendingPaymentsOlderThan: jest.fn().mockResolvedValue(0),
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
  findPendingByUser: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllEntityView: jest.fn(),
  findAnyByUser: jest.fn(),
  findPendingAll: jest.fn(),
  findExpiringSoon: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  incrementCouponsUsed: jest.fn(),
  atomicConsumeCoupon: jest.fn(),
  atomicRestoreCoupon: jest.fn(),
  hasActiveMembership: jest.fn(),
  approvePending: jest.fn(),
  expireExpiredMemberships: jest.fn(),
  findCouponAppointments: jest.fn(),
  addCouponsTotal: jest.fn(),
});

export const makeMockMembershipTransactionRepository = () => ({
  create: jest.fn(),
  findByMembershipId: jest.fn(),
  findByUser: jest.fn(),
  findAll: jest.fn(),
  findByMpPaymentId: jest.fn(),
});

export const makeMockRevenueEntryRepository = () => ({
  create: jest.fn(),
  findByReferenceId: jest.fn(),
  findByPaymentId: jest.fn(),
  getTotalByDateRange: jest.fn(),
  getTotalByDateRangeAndSource: jest.fn(),
  getRevenueByService: jest.fn(),
  getRevenueByBarber: jest.fn(),
  getRevenueByPeriod: jest.fn(),
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
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findByBoth: jest.fn(),
  createUnregistered: jest.fn(),
  findByIds: jest.fn(),
  searchRegistered: jest.fn(),
  updateAnalisisIA: jest.fn(),
  reservarAnalisisIA: jest.fn(),
  liberarLockAnalisisIA: jest.fn(),
  incrementarNoShow: jest.fn(),
  aplicarSancion: jest.fn(),
  levantarSancion: jest.fn(),
});

export const makeMockAnalisisCorteRepository = () => ({
  create: jest.fn(),
  findByClienteId: jest.fn(),
  findById: jest.fn(),
  actualizarImagenEjemplo: jest.fn(),
});

export const makeMockFaceValidationService = () => ({
  validar: jest.fn(),
});

export const makeMockRecommendationService = () => ({
  recomendar: jest.fn(),
});

export const makeMockImageGenerationService = () => ({
  generarEjemploDeCorte: jest.fn(),
});

export const makeMockCloudinaryService = () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
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
  verify: jest.fn(),
  verifyAndConsume: jest.fn(),
});

export const makeMockPaymentRepository = () => ({
  findById: jest.fn(),
  findByMpPreferenceId: jest.fn(),
  findByMpPaymentId: jest.fn(),
  findByReference: jest.fn(),
  findByUser: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  updateMpPreferenceId: jest.fn().mockResolvedValue(undefined),
  cancelPendingByAppointments: jest.fn(),
});

export const makeMockPaymentService = () => ({
  createPreference: jest.fn(),
  getPayment: jest.fn(),
  validateWebhookSignature: jest.fn(),
});

export const makeMockOrderRepository = () => ({
  findById: jest.fn(),
  findByUser: jest.fn(),
  findByUserId: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
});

export const makeMockProductRepository = () => ({
  findById: jest.fn(),
  findByIds: jest.fn(),
  findAll: jest.fn(),
  findPublicCatalog: jest.fn(),
  findByCategory: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  softDelete: jest.fn(),
  atomicDecreaseStock: jest.fn(),
  atomicIncreaseStock: jest.fn(),
  getCategories: jest.fn(),
});

export const makeMockTelegramLinkRepository = () => ({
  findByTelegramId: jest.fn(),
  findByUserId: jest.fn(),
  upsert: jest.fn(),
});

export const makeMockTelegramLinkTokenRepository = () => ({
  create: jest.fn(),
  verifyAndConsume: jest.fn(),
});
