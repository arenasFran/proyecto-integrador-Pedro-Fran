export interface IRandomGenerator {
  generateNumericCode(length: number): string;
  generateHexToken(bytes: number): string;
}
