export interface IHashService {
  sha256(input: string): string;
  constantTimeEqual(a: string, b: string): boolean;
}
