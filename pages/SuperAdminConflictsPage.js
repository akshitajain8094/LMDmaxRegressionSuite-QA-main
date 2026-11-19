// The Super Admin site (SUPER_ADMIN_URL) → Conflict Requests: the list and one request ("See More").
// After the login, open() blocks every request that is not a GET, so a test can never change another
// person's request or use Clear Data, even by mistake. allowActionsFor(id) lets the actions (Quick-Accept,
// Update & Resolve, Cancel Request) through for ONE request: the test's own.
class SuperAdminConflictsPage {
  constructor(page) {
    this.page = page;
    this.url = process.env.SUPER_ADMIN_URL;
    this.blocked = []; // the non-GET requests that were stopped
    this.allowedRequestId = null;

    // Sign in (the Sign In button has no name: Enter in the password box)
    this.email = page.getByRole('textbox', { name: 'Email ID' });
    this.password = page.getByRole('textbox', { name: 'Password' });

    // Menu and list
    this.menuLink = page.getByRole('link', { name: 'Conflict Requests' });
    this.heading = page.getByRole('heading', {
      name: 'Conflict Requests',
      level: 5,
    });
    this.table = page.getByRole('table');
    this.loadMore = page.getByRole('button', { name: 'Load More' });

    // One request
    this.back = page.getByRole('button', { name: 'Back' });
    this.detailsHeading = page.getByRole('heading', {
      name: 'Conflict Details:',
    });
    this.sentFrom = page.getByRole('heading', {
      name: 'REQUEST SENT FROM (NEW COMPANY)',
    });
    // A request can clash with several existing accounts: one section each
    this.sentFor = page
      .getByRole('heading', { name: 'REQUEST SENT FOR (EXISTING ACCOUNT)' })
      .first();
    // The action buttons ("Quick-Accept" on the page); clicked only with allowActionsFor
    this.quickAccept = page.getByRole('button', { name: /quick[- ]accept/i });
    this.updateAndResolve = page
      .getByRole('button', { name: /update & resolve/i })
      .first();
    this.cancelRequest = page.getByRole('button', { name: 'Cancel Request' });
    this.sendBack = page.getByRole('button', { name: /send back/i });
    // Quick-Accept's confirmation and the Update & Resolve form
    this.dialog = page.getByRole('dialog');
    this.confirm = this.dialog.getByRole('button', { name: 'Confirm' });
    this.dialogCancel = this.dialog.getByRole('button', { name: 'Cancel' });
    this.newPhone = this.dialog.getByRole('spinbutton');
    this.newEmail = this.dialog.getByRole('textbox');
    this.dialogUpdateAndResolve = this.dialog.getByRole('button', {
      name: 'Update & Resolve',
    });
    this.toast = page.getByRole('alert');
  }

  // Lets the actions through for this one request (the test's own) and nothing else
  allowActionsFor(requestId) {
    this.allowedRequestId = String(requestId);
  }

  // Signs in as the Super Admin (or the given user) and opens Conflict Requests. Afterwards only GETs pass.
  async open(
    email = process.env.SUPER_ADMIN_EMAIL,
    password = process.env.SUPER_ADMIN_PASSWORD,
  ) {
    let signedIn = false;
    await this.page.route('**/*', (route) => {
      const r = route.request();
      if (['GET', 'OPTIONS'].includes(r.method())) return route.continue();
      if (!signedIn && r.url().includes('/super_admin/login')) {
        return route.continue();
      }
      const ownAction =
        this.allowedRequestId &&
        r.url().includes('/super-admin/resolve-conflict') &&
        (r.postData() || '').includes(
          '"conflicted_request_id":"' + this.allowedRequestId + '"',
        );
      if (ownAction) return route.continue();
      this.blocked.push(r.method() + ' ' + r.url());
      return route.abort();
    });
    await this.page.goto(this.url + '/signIn');
    await this.email.fill(email);
    await this.password.fill(password);
    const login = this.page.waitForResponse((res) =>
      res.url().includes('/super_admin/login'),
    );
    await this.password.press('Enter');
    const answer = await login;
    signedIn = true;
    return answer;
  }

  // Opens the list and returns the first page of requests the server sent (the list's API answer)
  async openList() {
    const answer = this.page.waitForResponse(
      (res) =>
        res.url().includes('/conflicted-requests/?') &&
        res.request().method() === 'GET',
    );
    await this.page.goto(this.url + '/conflict_requests');
    const body = await (await answer).json();
    await this.heading.waitFor();
    return body.data;
  }

  // The row of a request (by the new user's name and status)
  row(userName, status) {
    return this.table
      .getByRole('row')
      .filter({
        has: this.page.getByRole('cell', { name: userName, exact: true }),
      })
      .filter({
        has: this.page.getByRole('cell', { name: status, exact: true }),
      });
  }

  // Opens one request (its "See More" page) by id
  async openRequest(id) {
    await this.page.goto(this.url + '/conflict_requests/' + id);
    await this.detailsHeading.waitFor();
  }
}

module.exports = SuperAdminConflictsPage;
