// Chat → SMS Chat (Twilio), and the secondary Twilio chat (Chat → <secondary name>, /chat-v2).
// Seen on staging (AQWA, arth) on 2026-11-18:
// - left: "Search Driver", the filter (funnel), Broadcast Message, the menu icon, "Pinned Chats", "Recent Chats",
//   "Load More", "Start New Group"
// - a driver's conversation: /chat/<driver id>/ — name and phone at the top, "Export Chat", the messages, a box
//   "Type a message" with the counter "<n>/1530" under it, Send. Right-click on a message: "Reply with quotes", "Tags"
// - a broadcast: /chat/<broadcast id>?broadcast=true — "This is a one-way broadcast message. Replies will appear in the
//   individual conversation." Each message: "Message sent to <delivered>/<members>" and Retry
// - Broadcast Message: "Broadcast Message — <n> Driver of <m> Selected", "Select All", "Remove All", "Broadcast Name"
//   (pencil), "Select at least 2 members to create a broadcast.", "Create Broadcast"
// - Start New Group: "New group — <n> of <m> Selected", tabs "Managers(n)" / "Drivers(n)", "Group Name" (pencil),
//   "Select at least 1 member to create a group.", "Create Group"
// - Filter: Stations (All Stations, AQWA, DYY6), Driver Type (All, Active, Inactive, Suspended, Groups, Latest Message
//   Received From Driver, Broadcast Lists, Message Not Received from Driver in Last 30 Days, Unread — each "(<count>)"),
//   Driver Role, "Reset", "Apply Filter"
const { expect } = require('@playwright/test');
const LoginPage = require('./LoginPage');
const InAppChatPage = require('./InAppChatPage');

class SmsChatPage {
  constructor(page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Search Driver').last(); // the one of the chat list (not the top bar)
    this.messageBox = page.getByPlaceholder('Type a message');
    this.sendButton = page.getByRole('button', { name: 'Send', exact: true });
    this.broadcastButton = page.getByRole('button', { name: 'Broadcast Message' });
    this.newGroupButton = page.getByRole('button', { name: /Start New Group/ });
    this.pinnedChats = page.getByText('Pinned Chats', { exact: true });
    this.recentChats = page.getByText('Recent Chats', { exact: true });
    this.loadMore = page.getByText('Load More', { exact: true });
    this.exportChat = page.getByRole('button', { name: /Export Chat/ });
    this.noChatSelected = page.getByText('Please Select A Driver To Chat');
    // under the message box: "<typed>/<limit>"
    this.counter = page.getByText(/^\d+\/(1530|570|1550)$/);
    // the "too long" pop-up
    this.splitWarning = page.getByText(/The message exceeds the/);
    this.splitNo = page.getByRole('button', { name: 'No', exact: true });
    this.splitYes = page.getByRole('button', { name: /^Yes, send as/ });
    // broadcast
    this.oneWayNotice = page.getByText(/This is a one-way broadcast message/);
    this.selectAll = page.getByText('Select All', { exact: true });
    this.removeAll = page.getByText('Remove All', { exact: true });
    this.selectedCount = page.getByText(/\d+ Drivers? of \d+ Selected/);
    this.minMembersNote = page.getByText(/Select at least \d+ members? to create a (broadcast|group)\./);
    this.createBroadcastButton = page.getByRole('button', { name: 'Create Broadcast' });
    this.createGroupButton = page.getByRole('button', { name: 'Create Group' });
    // filter
    this.filterDialog = page.getByText('Filter', { exact: true }).locator('xpath=ancestor::div[.//button[normalize-space()="Apply Filter"]][1]');
    this.applyFilter = page.getByRole('button', { name: 'Apply Filter' });
    this.resetFilter = page.getByText('Reset', { exact: true });
    // context menu of a message
    this.replyWithQuote = page.getByText(/^Reply with quotes?$/);
    this.tagOption = page.getByText('Tags', { exact: true });
    this.welcomeChatNumber = page.getByText(/LMDmax Chat #:/);
  }

  // Logs in as the chat owner (or the given user), on the chat station
  async login(email = process.env.CHAT_OWNER_EMAIL, password = process.env.CHAT_OWNER_PASSWORD) {
    const loginPage = new LoginPage(this.page);
    await loginPage.open();
    await loginPage.login(email, password);
    await expect(this.page).toHaveURL(/dashboard|chat/, { timeout: 30000 });
    await this.selectStation(process.env.CHAT_STATION_CODE);
  }

  // The station button (top right) opens a menu of the stations, each a button "<letter> <CODE>". On chat pages the
  // button is greyed out, so this is done on the dashboard (right after login).
  async selectStation(code) {
    const button = new InAppChatPage(this.page).stationButton;
    await button.waitFor({ timeout: 60000 });
    if ((await button.innerText()).trim() === code) return;
    await button.click();
    await this.page.getByRole('menu').getByRole('button', { name: new RegExp(code + '$') }).click();
    await expect(button).toHaveText(code, { timeout: 30000 });
  }

  async open() {
    await this.page.goto('/chat');
    await expect(this.recentChats.or(this.pinnedChats).first()).toBeVisible({ timeout: 30000 });
  }
  async openSecondary() {
    await this.page.goto('/chat-v2');
  }
  async openDriver(driverId) {
    await this.page.goto('/chat/' + driverId + '/');
    await expect(this.messageBox).toBeVisible({ timeout: 30000 });
  }
  async openBroadcast(broadcastId) {
    await this.page.goto('/chat/' + broadcastId + '?broadcast=true');
    await expect(this.oneWayNotice).toBeVisible({ timeout: 30000 });
  }

  // The toolbar icons next to "Search Driver" have no names: the funnel is the first, the broadcast icon the second
  toolbarIcon(n) {
    return this.searchBox.locator('xpath=ancestor::div[1]/following-sibling::*').locator('button, svg').nth(n);
  }
  async openFilter() {
    await this.page.locator('[data-testid="FilterAltIcon"], [data-testid="FilterListIcon"]').first().click().catch(async () => {
      await this.toolbarIcon(0).click();
    });
    await expect(this.applyFilter).toBeVisible();
  }
  // "Active (104)" → 104
  async filterCount(label) {
    const text = await this.page.getByText(new RegExp('^' + label + ' \\(\\d+\\)$')).first().innerText();
    return Number(text.match(/\((\d+)\)/)[1]);
  }
  async chooseFilter(label) {
    await this.page.getByText(new RegExp('^' + label + ' \\(\\d+\\)$')).first().click();
    await this.applyFilter.click();
  }

  // The rows of the chat list
  chatRow(name) {
    return this.page.getByText(name, { exact: true }).first().locator('xpath=ancestor::*[self::li or self::div][.//*[contains(text(),":")]][1]');
  }
  async search(text) {
    await this.searchBox.fill(text);
  }
  async openConversation(name) {
    await this.search(name);
    await this.page.getByText(name, { exact: true }).first().click();
    await expect(this.messageBox).toBeVisible();
  }

  // A message bubble by its text, and its "Message sent to x/y" line (broadcast)
  message(text) {
    return this.page.getByText(text, { exact: true }).last();
  }
  async sentToOf(text) {
    const bubble = this.message(text).locator('xpath=ancestor::div[.//*[starts-with(normalize-space(),"Message sent to")]][1]');
    const line = await bubble.getByText(/^Message sent to/).last().innerText();
    const [, delivered, total] = line.match(/(\d+)\s*\/\s*(\d+)/);
    return { delivered: Number(delivered), total: Number(total), line };
  }

  async type(text) {
    await this.messageBox.fill(text);
  }
  async send(text) {
    await this.type(text);
    await this.sendButton.click();
  }

  // New broadcast: chooses drivers by name, sets the name, clicks Create Broadcast
  async startBroadcast() {
    await this.broadcastButton.click();
    await expect(this.createBroadcastButton).toBeVisible();
  }
  async pickDriver(name) {
    await this.searchBox.fill(name);
    await this.page.getByText(name, { exact: true }).first().click();
    await this.searchBox.fill('');
  }
  async setName(name) {
    await this.page.locator('[data-testid="EditIcon"], [aria-label*="edit" i]').first().click();
    const box = this.page.getByRole('textbox').last();
    await box.fill(name);
    await box.press('Enter');
  }
  async startGroup() {
    await this.newGroupButton.click();
    await expect(this.createGroupButton).toBeVisible();
  }
}

module.exports = SmsChatPage;
