export interface PasswordValidation {
  label: string;
  valid: boolean;
}

export const getPasswordRules = (password: string, confirmPassword: string) => {
  const rules = [
    {
      label: "8–20 characters",
      valid: password.length >= 8 && password.length <= 20,
    },
    { label: "At least one uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", valid: /[a-z]/.test(password) },
    { label: "At least one number", valid: /[0-9]/.test(password) },
    {
      label: "Passwords match",
      valid: password === confirmPassword && confirmPassword.length > 0,
    },
  ];
  return rules;
};
