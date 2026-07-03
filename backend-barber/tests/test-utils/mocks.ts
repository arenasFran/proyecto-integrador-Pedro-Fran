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
