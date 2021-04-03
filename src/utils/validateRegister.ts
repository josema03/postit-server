class FieldError {
  field: string;
  message: string;
}

class UsernamePasswordInput {
  username: string;
  email: string;
  password: string;
}

export const validateRegister = (
  options: UsernamePasswordInput
): FieldError[] | null => {
  const errors: FieldError[] = [];
  if (options.username.length <= 3) {
    errors.push({
      field: 'username',
      message: 'Username must be longer than 3 characters',
    });
  }
  if (options.username.includes('@') && errors.length < 1) {
    errors.push({
      field: 'username',
      message: 'Username cannot include @',
    });
  }
  if (options.password.length <= 3) {
    errors.push({
      field: 'password',
      message: 'Password must be longer than 3 characters',
    });
  }
  if (!options.email.match(/^[\w\d.]+@[\w\d.]+/)) {
    errors.push({
      field: 'email',
      message: 'Invalid email',
    });
  }
  return errors.length > 0 ? errors : null;
};
