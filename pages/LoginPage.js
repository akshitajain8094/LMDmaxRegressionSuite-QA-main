// The login screen: where its elements are, and what a user can do on it
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    // By placeholder: after the eye icon is clicked, the password box has no name any more
    this.passwordInput = page.getByPlaceholder('Password', { exact: true });
    this.signInButton = page.getByRole('button', {
      name: 'Sign In',
      exact: true,
    });
    this.heading = page.getByRole('heading', { name: 'Sign In' });
    this.eyeIcon = page.getByRole('button', {
      name: 'toggle password visibility',
    });
    this.forgotPasswordLink = page.getByText('Forgot Password?');
    this.googleButton = page.getByRole('button', {
      name: 'Sign In With Google',
    });
    this.appleButton = page.getByRole('button', {
      name: 'Sign In With Apple ID',
    });
    this.otpButton = page.getByRole('button', { name: 'Sign In With OTP' });
    this.signUpLink = page.getByRole('button', { name: 'Sign Up' });

    // "Sign In With OTP" and "Forgot Password?" screens: one box for the email or mobile number
    this.emailOrMobileInput = page.getByPlaceholder('Email or mobile no.');
    this.sendOtpButton = page.getByRole('button', { name: 'Send OTP' });
    this.signInWithEmailButton = page.getByRole('button', {
      name: 'Sign In With Email ID',
    });
    this.backToSignInButton = page.getByRole('button', {
      name: 'Back To Sign In',
    });
  }

  async open() {
    await this.page.goto('/');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  // "Sign In With OTP" → type the email or mobile number → Send OTP
  async requestOtp(emailOrMobile) {
    await this.otpButton.click();
    await this.emailOrMobileInput.fill(emailOrMobile);
    await this.sendOtpButton.click();
  }
}

module.exports = LoginPage;
