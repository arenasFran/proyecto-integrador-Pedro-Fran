import crypto from 'crypto';

export interface TestUser {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

const uniqueId = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

const randomDigits = (length: number): string => {
  let result = '';
  while (result.length < length) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
};

export const buildTestUser = (): TestUser => {
  const id = uniqueId();
  const password = `Pass${id}!`;

  return {
    email: `e2e.${id}@example.com`,
    password,
    repeatPassword: password,
    name: `Test${id.slice(-3)}`,
    lastname: `User${id.slice(-2)}`,
    phone: `+598${randomDigits(9)}`,
  };
};

export const twoFactorCode = '123456';
