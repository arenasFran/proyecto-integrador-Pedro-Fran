export interface IPasswordHasher {
  hash(raw: string): Promise<string>;
  compare(raw: string, hash: string): Promise<boolean>;
}
