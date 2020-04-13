interface IAuthError extends Error {
  name: string;
  message: string;
  authError: boolean;
}
