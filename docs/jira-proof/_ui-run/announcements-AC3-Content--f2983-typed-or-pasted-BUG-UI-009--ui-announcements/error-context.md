# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\announcements.spec.js >> AC3 Content and attachments >> ANN-041, ANN-042: Verify that the title does not take more than 100 characters, typed or pasted (BUG-UI-009)
- Location: tests\ui\announcements.spec.js:497:3

# Error details

```
Error: ANN-041 typing

expect(locator).toHaveText(expected) failed

Locator: getByText(/^[\d,]+ \/ 100 characters$/)
Expected: "100 / 100 characters"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - ANN-041 typing getByText(/^[\d,]+ \/ 100 characters$/) with timeout 15000ms
  - waiting for getByText(/^[\d,]+ \/ 100 characters$/)

```

```yaml
- img
- separator
- link "0":
  - /url: /v2/dashboard/daily-highlights
- img
- text: "0"
- img
- text: "0"
- link "0":
  - /url: /templates
- link "0":
  - /url: /management/callouts
- link "0":
  - /url: /report
  - img
  - text: "0"
- link "0":
  - /url: /inventory
  - img
  - text: "0"
- link "0":
  - /url: /lmd_cloud
  - img
  - text: "0"
- img
- text: "0"
- heading "Welcome Arth" [level=6]
- 'heading "LMDmax Chat #: 908-975-1722" [level=6]'
- combobox "Search Driver"
- button "Notes":
  - img
- button "Workflow"
- button "Notifications": "14"
- button "Settings"
- button "DYY6"
- button "Profile": A
- button "Announcements"
- heading "Create announcement" [level=1]
- region "Content":
  - heading "Content" [level=2]
  - text: Title *
  - textbox "Title *" [invalid]:
    - /placeholder: e.g. Updated Driver Safety Policy
    - text: ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttX
  - paragraph: Title cannot exceed 100 characters. 101 / 100
  - text: Description *
  - toolbar "Description formatting":
    - button "Bulleted list"
    - button "Numbered list"
  - textbox "Description *":
    - text: Write the announcement details here…
    - paragraph
  - paragraph: Start a line with - or 1. to make a list.
  - paragraph: 0 / 10,000 characters
  - paragraph: Attachments (optional)
  - paragraph:
    - text: Drag files here or
    - button "browse"
    - text: · PDF, DOCX, XLSX, PNG, JPG up to 10 MB
- region "Recipients":
  - heading "Recipients" [level=2]
  - paragraph: Announcements are sent to drivers.
  - radio "All drivers All 67 drivers, plus new drivers automatically when they join." [checked]
  - paragraph: All drivers
  - paragraph: All 67 drivers, plus new drivers automatically when they join.
  - radio "Selected drivers Pick specific drivers. Drivers who join later won't receive it."
  - paragraph: Selected drivers
  - paragraph: Pick specific drivers. Drivers who join later won't receive it.
  - paragraph: Sends to 67 drivers. Drivers who join later get it automatically. Only drivers with LMD Driver app access will receive it.
- region "Engagement":
  - heading "Engagement" [level=2]
  - paragraph: How drivers can interact with this announcement.
  - paragraph: Comments
  - paragraph: Who can comment on this announcement?
  - radio "Everyone can comment and reply Drivers and admins can comment and reply to each other, like a post." [checked]
  - paragraph: Everyone can comment and reply
  - paragraph: Drivers and admins can comment and reply to each other, like a post.
  - radio "Drivers comment, admins reply Each driver sees only their own comment and the replies to it. Admins can only reply."
  - paragraph: Drivers comment, admins reply
  - paragraph: Each driver sees only their own comment and the replies to it. Admins can only reply.
  - radio "Off No one can comment."
  - paragraph: "Off"
  - paragraph: No one can comment.
  - separator
  - paragraph: Acknowledgement
  - paragraph: Require acknowledgement
  - paragraph: Drivers must tap “Acknowledge”. Track progress in Activity.
  - checkbox "Require acknowledgement"
- status:
  - paragraph: Add a title and description to continue.
- button "Cancel"
- button "Review & send" [disabled]
- button "LMDmax CoPilot":
  - img
  - text: LMDmax CoPilot
```

# Test source

```ts
  405 |       for (const name of [
  406 |         'qa-sample.txt',
  407 |         'qa-sample.gif',
  408 |         'qa-sample.mp4',
  409 |         'qa-sample.exe',
  410 |       ]) {
  411 |         await announcements.fileInput.setInputFiles(file(name));
  412 |         await expect(page.getByText(name)).toBeVisible();
  413 |       }
  414 |       await expect(
  415 |         page.getByText(
  416 |           'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.',
  417 |         ),
  418 |       ).toHaveCount(4);
  419 |       await expect(announcements.status).toHaveText(
  420 |         'Remove the attachments that could not be added.',
  421 |       );
  422 |       await expect(announcements.reviewAndSend).toBeDisabled();
  423 |       for (const name of [
  424 |         'qa-sample.txt',
  425 |         'qa-sample.gif',
  426 |         'qa-sample.mp4',
  427 |         'qa-sample.exe',
  428 |       ]) {
  429 |         await page.getByRole('button', { name: 'Remove ' + name }).click();
  430 |       }
  431 |       await expect(announcements.status).toHaveText(/^Sends to 1 driver/);
  432 |       await expect(announcements.reviewAndSend).toBeEnabled();
  433 |     },
  434 |   );
  435 | 
  436 |   test(
  437 |     'ANN-055: Verify that an .exe renamed to .pdf is rejected with a message',
  438 |     tags,
  439 |     async ({ page }) => {
  440 |       const announcements = await openCreate(page);
  441 |       await announcements.fillAnnouncement('QA title');
  442 |       await announcements.fileInput.setInputFiles(file('qa-exe-renamed.pdf'));
  443 |       await expect(
  444 |         page.getByText('qa-exe-renamed.pdf is not a supported file type'),
  445 |       ).toBeVisible();
  446 |       await expect(announcements.reviewAndSend).toBeDisabled();
  447 |     },
  448 |   );
  449 | });
  450 | 
  451 | test.describe('AC3 Content and attachments', () => {
  452 |   test(
  453 |     'ANN-039, ANN-043: Verify that the title and description counters follow typing and deleting',
  454 |     tags,
  455 |     async ({ page }) => {
  456 |       const announcements = await openCreate(page);
  457 |       await announcements.title.fill('x'.repeat(20));
  458 |       await expect(announcements.titleCounter).toHaveText(
  459 |         '20 / 100 characters',
  460 |       );
  461 |       for (let i = 0; i < 5; i++) await announcements.title.press('Backspace');
  462 |       await expect(announcements.titleCounter).toHaveText(
  463 |         '15 / 100 characters',
  464 |       );
  465 |       await announcements.description.click();
  466 |       await page.keyboard.insertText('y'.repeat(200));
  467 |       await expect(announcements.descriptionCounter).toHaveText(
  468 |         '200 / 10,000 characters',
  469 |       );
  470 |       for (let i = 0; i < 50; i++) await page.keyboard.press('Backspace');
  471 |       await expect(announcements.descriptionCounter).toHaveText(
  472 |         '150 / 10,000 characters',
  473 |       );
  474 |     },
  475 |   );
  476 | 
  477 |   test(
  478 |     'ANN-040, ANN-044: Verify that the title takes exactly 100 and the description exactly 10,000 characters',
  479 |     tags,
  480 |     async ({ page }) => {
  481 |       const announcements = await openCreate(page);
  482 |       await announcements.title.fill('t'.repeat(100));
  483 |       await expect(announcements.titleCounter).toHaveText(
  484 |         '100 / 100 characters',
  485 |       );
  486 |       await announcements.description.click();
  487 |       await page.keyboard.insertText('d'.repeat(10000));
  488 |       await expect(announcements.descriptionCounter).toHaveText(
  489 |         '10,000 / 10,000 characters',
  490 |       );
  491 |       await expect(page.getByText(/cannot exceed/)).toHaveCount(0);
  492 |     },
  493 |   );
  494 | 
  495 |   // The app lets the text go over the limit, then shows "Title cannot exceed 100 characters. 101 / 100" and
  496 |   // blocks Review & send. The sheet expects that the extra characters are not taken at all.
  497 |   test(
  498 |     'ANN-041, ANN-042: Verify that the title does not take more than 100 characters, typed or pasted (BUG-UI-009)',
  499 |     bugTags,
  500 |     async ({ page }) => {
  501 |       const announcements = await openCreate(page);
  502 |       await announcements.title.fill('t'.repeat(100));
  503 |       await announcements.title.press('End');
  504 |       await page.keyboard.type('X'); // ANN-041: the 101st character
> 505 |       await expect(announcements.titleCounter, 'ANN-041 typing').toHaveText(
      |                                                                  ^ Error: ANN-041 typing
  506 |         '100 / 100 characters',
  507 |       );
  508 |       await announcements.title.fill('');
  509 |       await announcements.title.focus();
  510 |       await page.keyboard.insertText('p'.repeat(150)); // ANN-042: like a paste
  511 |       await expect(announcements.titleCounter, 'ANN-042 paste').toHaveText(
  512 |         '100 / 100 characters',
  513 |       );
  514 |       await expect(announcements.title).toHaveValue('p'.repeat(100));
  515 |     },
  516 |   );
  517 | 
  518 |   test(
  519 |     'ANN-045, ANN-046: Verify that the description does not take more than 10,000 characters, typed or pasted (BUG-UI-009)',
  520 |     bugTags,
  521 |     async ({ page }) => {
  522 |       const announcements = await openCreate(page);
  523 |       await announcements.description.click();
  524 |       await page.keyboard.insertText('d'.repeat(10000));
  525 |       await page.keyboard.type('X'); // ANN-045
  526 |       await expect(
  527 |         announcements.descriptionCounter,
  528 |         'ANN-045 typing',
  529 |       ).toHaveText('10,000 / 10,000 characters');
  530 |       await page.keyboard.press('Control+A');
  531 |       await page.keyboard.press('Delete');
  532 |       await page.keyboard.insertText('e'.repeat(10050)); // ANN-046: like a paste
  533 |       await expect(
  534 |         announcements.descriptionCounter,
  535 |         'ANN-046 paste',
  536 |       ).toHaveText('10,000 / 10,000 characters');
  537 |     },
  538 |   );
  539 | 
  540 |   test(
  541 |     'ANN-047, ANN-093, ANN-094, ANN-095: Verify the review: recipients, comments, acknowledgement, attachments, the preview with its list, and the number of drivers notified',
  542 |     tags,
  543 |     async ({ page }) => {
  544 |       const announcements = await openCreate(page);
  545 |       const title = unique('QA review');
  546 |       await announcements.title.fill(title);
  547 |       await announcements.typeDescription(
  548 |         'First line\n- bullet one\nbullet two',
  549 |       );
  550 |       await expect(announcements.description.getByRole('listitem')).toHaveCount(
  551 |         2,
  552 |       );
  553 |       await announcements.pickDrivers([driverName()]);
  554 |       await page
  555 |         .getByRole('radio', { name: /^Drivers comment, admins reply/ })
  556 |         .check();
  557 |       await announcements.acknowledgement.check();
  558 |       await announcements.fileInput.setInputFiles([
  559 |         file('qa-sample.pdf'),
  560 |         file('qa-sample.png'),
  561 |       ]);
  562 |       await expect(
  563 |         page.getByRole('button', { name: 'Remove qa-sample.png' }),
  564 |       ).toBeVisible();
  565 |       await expect(announcements.reviewAndSend).toBeEnabled();
  566 |       await announcements.reviewAndSend.click();
  567 |       const review = announcements.dialog;
  568 |       await expect(
  569 |         review.getByRole('heading', { name: 'Review announcement' }),
  570 |       ).toBeVisible();
  571 |       for (const text of [
  572 |         '1 selected driver',
  573 |         driverName(),
  574 |         'Drivers comment, admins reply',
  575 |         'Required',
  576 |         '2 files',
  577 |         title,
  578 |         'qa-sample.pdf',
  579 |         'qa-sample.png',
  580 |         '1 driver will be notified.',
  581 |       ]) {
  582 |         await expect(
  583 |           review.getByText(text, { exact: false }).first(),
  584 |           text,
  585 |         ).toBeVisible();
  586 |       }
  587 |       // ANN-047: the preview keeps the line break and the two bullets
  588 |       const preview = (
  589 |         await review.getByText('First line').locator('..').innerText()
  590 |       ).replace(/[ \t]+/g, ' ');
  591 |       expect(preview).toMatch(
  592 |         /First line\s*\n\s*• ?bullet one\s*\n\s*• ?bullet two/,
  593 |       );
  594 |       await announcements.backToEditing.click();
  595 |       await announcements.cancel.click();
  596 |     },
  597 |   );
  598 | 
  599 |   test(
  600 |     'ANN-052, ANN-057, ANN-058: Verify that the five supported formats can be attached, and removing one keeps the others',
  601 |     tags,
  602 |     async ({ page }) => {
  603 |       const announcements = await openCreate(page);
  604 |       await announcements.fillAnnouncement('QA title');
  605 |       const names = [
```