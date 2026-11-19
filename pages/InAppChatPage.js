// Chat → the in-app chat: the tabs "Paya Chat" and "Individual Chat", the chat list (left) and a conversation (right)
class InAppChatPage {
  constructor(page) {
    this.page = page;
    // The station button at the top right (e.g. "DYY1"); it opens the list of stations
    this.stationButton = page.getByRole('button', {
      name: /^(DYY1|DYY6|AAA|WAQA|SDSD|AQWA)$/,
    });
    this.searchBox = page.getByPlaceholder('Search....');
    this.messageBox = page.getByPlaceholder('Type a message');
    // The question after Delete: "Delete Message – Are you sure you want to delete this message for everyone?"
    this.deleteQuestion = page.getByText(
      'Are you sure you want to delete this message for everyone?',
    );
  }

  // tab: 'paya' (Paya Chat) or 'individual' (Individual Chat)
  async open(tab) {
    await this.page.goto(
      '/in-app-chat/' + (tab === 'paya' ? 'company' : 'individual') + '/all',
    );
  }

  // A login opens the station used last; the tests need their own (ENV-002)
  async selectStation(stationCode) {
    await this.stationButton.waitFor();
    if ((await this.stationButton.innerText()).trim() === stationCode) return;
    await this.stationButton.click();
    await this.page
      .locator('.MuiPopover-paper')
      .getByText(stationCode, { exact: true })
      .first()
      .click();
    await this.stationButton.filter({ hasText: stationCode }).waitFor();
  }

  // The chat-list row of a person: their name and the preview of the last message
  chatRow(name) {
    // The name is a heading; its row is two levels up (name, preview and time)
    return this.page
      .getByRole('heading', { name, exact: true })
      .first()
      .locator('xpath=../..');
  }

  async openConversation(name) {
    await this.searchBox.fill(name);
    await this.page.getByRole('heading', { name, exact: true }).first().click();
  }

  // A message bubble in the open conversation
  message(text) {
    return this.page.locator('[id^="messages_"]', { hasText: text });
  }

  // The latest message bubble of the open conversation. The order in the page differs between the tabs,
  // so it is the bubble with the highest message number (id "messages_<number>").
  async lastMessage() {
    const bubbles = this.page.locator('[id^="messages_"]');
    await bubbles.first().waitFor();
    const ids = await bubbles.evaluateAll((all) =>
      all.map((bubble) => Number(bubble.id.replace('messages_', ''))),
    );
    return this.page.locator('#messages_' + Math.max(...ids));
  }

  async sendMessage(text) {
    await this.messageBox.fill(text);
    await this.messageBox.press('Enter');
  }

  // Hover the message → the red trash icon (Delete) → Delete in the question
  async deleteMessage(text) {
    await this.deleteBubble(this.message(text));
  }

  // The same for the last message, e.g. an image (it has no text)
  async deleteLastMessage() {
    await this.deleteBubble(await this.lastMessage());
  }

  async deleteBubble(bubble) {
    await bubble.hover();
    await bubble
      .locator('xpath=..')
      .getByRole('button', { name: 'Delete' })
      .click();
    await this.deleteQuestion.waitFor();
    await this.page
      .locator('div', { has: this.deleteQuestion })
      .last()
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
  }
}

module.exports = InAppChatPage;
