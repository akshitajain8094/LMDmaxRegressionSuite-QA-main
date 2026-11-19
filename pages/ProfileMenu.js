// The profile menu at the top right of every page (the circle with the user's initials, e.g. "CA")
class ProfileMenu {
  constructor(page) {
    this.page = page;
    this.profileButton = page.getByRole('button', { name: 'Profile' });
    // The menu shows "Hi, <name>", the email, "Go To Profile" and "Log Out"
    this.logOutButton = page.getByRole('button', { name: 'Log Out' });
  }

  async logOut() {
    await this.profileButton.click();
    await this.logOutButton.click();
  }
}

module.exports = ProfileMenu;
