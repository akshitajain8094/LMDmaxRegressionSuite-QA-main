# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\announcements.spec.js >> AC9, AC10 Activity and History >> ANN-137: Verify that each activity row shows the driver's station and seen date/time (BUG-UI-010)
- Location: tests\ui\announcements.spec.js:1197:3

# Error details

```
Error: the row has the station

expect(locator).toContainText(expected) failed

Locator: getByRole('table', { name: 'Driver activity list' }).getByRole('row', { name: /Chad Elnahal/ })
Expected substring: "DYY6"
Received string:    "CEChad ElnahalNot seen"
Timeout: 15000ms

Call log:
  - the row has the station getByRole('table', { name: 'Driver activity list' }).getByRole('row', { name: /Chad Elnahal/ }) with timeout 15000ms
  - waiting for getByRole('table', { name: 'Driver activity list' }).getByRole('row', { name: /Chad Elnahal/ })
    28 × locator resolved to <tr data-index="0" data-item-index="0" data-known-size="34" item="[object Object]" class="MuiTableRow-root MuiTableRow-hover css-1uekmho">…</tr>
       - unexpected value "CEChad ElnahalNot seen"

```

```yaml
- row "CE Chad Elnahal Not seen":
  - cell "CE Chad Elnahal":
    - text: CE
    - paragraph: Chad Elnahal
  - cell "Not seen":
    - paragraph: Not seen
```

# Test source

```ts
  1111 |       ).toEqual(['Delete comment']);
  1112 |       // ANN-127, ANN-128: the comment has a reply: the confirmation says the replies go too
  1113 |       await page.getByRole('menuitem', { name: 'Delete comment' }).click();
  1114 |       const confirm = announcements.dialog;
  1115 |       await expect(confirm.getByText('Delete this comment?')).toBeVisible();
  1116 |       await expect(confirm).toContainText(/repl/i);
  1117 |       // ANN-129: Cancel keeps it
  1118 |       await confirm.getByRole('button', { name: 'Cancel' }).click();
  1119 |       await expect(page.getByText('QA parent with reply')).toBeVisible();
  1120 |       await expect(page.getByText('QA reply', { exact: true })).toBeVisible();
  1121 |     },
  1122 |   );
  1123 | 
  1124 |   test(
  1125 |     'ANN-084: Verify that in "Drivers comment, admins reply" mode the admin has no box to start a new comment',
  1126 |     tags,
  1127 |     async ({ page, api }) => {
  1128 |       const { id } = await sendByApi(api, {
  1129 |         title: unique('QA private'),
  1130 |         comment_mode: 'driver_owner_admin_reply',
  1131 |       });
  1132 |       const announcements = new AnnouncementsPage(page);
  1133 |       await announcements.open();
  1134 |       await announcements.openDetails(id);
  1135 |       await expect(
  1136 |         page.getByText(/Admins can.t start a new comment/),
  1137 |       ).toBeVisible();
  1138 |       await expect(announcements.commentBox).toHaveCount(0);
  1139 |     },
  1140 |   );
  1141 | 
  1142 |   test(
  1143 |     'ANN-121: Verify that unread comments of another admin are marked New',
  1144 |     tags,
  1145 |     async ({ page, api }) => {
  1146 |       const adminB = await ann.login('ADMIN_B');
  1147 |       const { id } = await sendByApi(api, { title: unique('QA new comments') });
  1148 |       await ann.addComment(api, adminB, id, 'QA new one');
  1149 |       await ann.addComment(api, adminB, id, 'QA new two');
  1150 |       const announcements = new AnnouncementsPage(page);
  1151 |       await announcements.open();
  1152 |       await announcements.openDetails(id);
  1153 |       await expect(page.getByText('New', { exact: true })).toHaveCount(2);
  1154 |     },
  1155 |   );
  1156 | });
  1157 | 
  1158 | // ---------- AC9 and AC10: activity and history ----------
  1159 | 
  1160 | test.describe('AC9, AC10 Activity and History', () => {
  1161 |   test(
  1162 |     'ANN-135, ANN-140, ANN-141, ANN-144, ANN-145, ANN-146: Verify the activity counts, the Not seen status, filters and search',
  1163 |     tags,
  1164 |     async ({ page, api }) => {
  1165 |       const { id } = await sendByApi(api, {
  1166 |         title: unique('QA activity'),
  1167 |         acknowledgement_enabled: true,
  1168 |       });
  1169 |       const announcements = new AnnouncementsPage(page);
  1170 |       await announcements.open();
  1171 |       await announcements.openDetails(id);
  1172 |       await page.getByRole('tab', { name: /^Activity/ }).click();
  1173 |       const table = page.getByRole('table', { name: 'Driver activity list' });
  1174 |       await expect(
  1175 |         table.getByRole('row', { name: new RegExp(driverName()) }),
  1176 |       ).toContainText(/Not seen/);
  1177 |       await page.getByRole('button', { name: /^Not seen/ }).click();
  1178 |       await expect(
  1179 |         table.getByRole('row', { name: new RegExp(driverName()) }),
  1180 |       ).toBeVisible();
  1181 |       await page.getByRole('button', { name: /^All/ }).first().click();
  1182 |       await page
  1183 |         .getByRole('textbox', { name: 'Search drivers' })
  1184 |         .fill(driverName().split(' ')[0]);
  1185 |       await expect(
  1186 |         table.getByRole('row', { name: new RegExp(driverName()) }),
  1187 |       ).toBeVisible();
  1188 |       await page
  1189 |         .getByRole('textbox', { name: 'Search drivers' })
  1190 |         .fill('zz-nobody');
  1191 |       await expect(
  1192 |         page.getByText(/No drivers found|Showing 0 drivers/).first(),
  1193 |       ).toBeVisible();
  1194 |     },
  1195 |   );
  1196 | 
  1197 |   test(
  1198 |     "ANN-137: Verify that each activity row shows the driver's station and seen date/time (BUG-UI-010)",
  1199 |     bugTags,
  1200 |     async ({ page, api }) => {
  1201 |       const { id } = await sendByApi(api, {
  1202 |         title: unique('QA activity station'),
  1203 |       });
  1204 |       const announcements = new AnnouncementsPage(page);
  1205 |       await announcements.open();
  1206 |       await announcements.openDetails(id);
  1207 |       await page.getByRole('tab', { name: /^Activity/ }).click();
  1208 |       const row = page
  1209 |         .getByRole('table', { name: 'Driver activity list' })
  1210 |         .getByRole('row', { name: new RegExp(driverName()) });
> 1211 |       await expect(row, 'the row has the station').toContainText(
       |                                                    ^ Error: the row has the station
  1212 |         process.env.ANN_STATION_CODE,
  1213 |       );
  1214 |     },
  1215 |   );
  1216 | 
  1217 |   test(
  1218 |     'ANN-149, ANN-150: Verify that History lists the changes newest first with who and when, and a title change with before and after',
  1219 |     tags,
  1220 |     async ({ page, api }) => {
  1221 |       const owner = await ann.login();
  1222 |       const { id, body } = await sendByApi(api, {
  1223 |         title: unique('QA history'),
  1224 |       });
  1225 |       await ann.dataOf(
  1226 |         await ann.api.update(api, owner, id, {
  1227 |           ...body,
  1228 |           title: body.title + ' edited',
  1229 |         }),
  1230 |         'Saving the edit',
  1231 |       );
  1232 |       const announcements = new AnnouncementsPage(page);
  1233 |       await announcements.open();
  1234 |       await announcements.openDetails(id);
  1235 |       await page.getByRole('tab', { name: /^History/ }).click();
  1236 |       const entries = page
  1237 |         .getByRole('list', { name: 'History' })
  1238 |         .getByRole('listitem');
  1239 |       await expect(entries.last()).toContainText('created the announcement');
  1240 |       const latest = entries.first();
  1241 |       await expect(latest.getByText('Arth', { exact: true })).toBeVisible();
  1242 |       await expect(latest.getByText('changed the Title')).toBeVisible();
  1243 |       await expect(latest.locator('time')).toBeVisible();
  1244 |       await expect(
  1245 |         latest.getByText(body.title, { exact: true }),
  1246 |         'old title',
  1247 |       ).toBeVisible();
  1248 |       await expect(
  1249 |         latest.getByText(body.title + ' edited', { exact: true }),
  1250 |         'new title',
  1251 |       ).toBeVisible();
  1252 |     },
  1253 |   );
  1254 | });
  1255 | 
  1256 | // ---------- AC11: edit ----------
  1257 | 
  1258 | test.describe('AC11 Edit', () => {
  1259 |   test(
  1260 |     'ANN-161, ANN-172, ANN-188: Verify that Edit opens with the current values and the sent-announcement warning, and Cancel saves nothing',
  1261 |     tags,
  1262 |     async ({ page, api }) => {
  1263 |       const owner = await ann.login();
  1264 |       const { id, body } = await sendByApi(api, {
  1265 |         title: unique('QA edit page'),
  1266 |       });
  1267 |       const announcements = new AnnouncementsPage(page);
  1268 |       await announcements.open();
  1269 |       await announcements.openEdit(id);
  1270 |       await expect(announcements.title).toHaveValue(body.title);
  1271 |       await expect(announcements.description).toContainText(body.description);
  1272 |       await expect(
  1273 |         page.getByText(
  1274 |           /You.re editing a sent announcement \(1 driver\)\. Changes are recorded in History\./,
  1275 |         ),
  1276 |       ).toBeVisible();
  1277 |       await expect(announcements.reviewChanges).toBeDisabled();
  1278 |       await announcements.title.fill(body.title + ' changed');
  1279 |       await announcements.cancel.click();
  1280 |       const data = await ann.overview(api, owner, id);
  1281 |       expect({
  1282 |         title: data.title,
  1283 |         is_edited: data.is_edited,
  1284 |         history: data.tabs.history_count,
  1285 |       }).toEqual({ title: body.title, is_edited: false, history: 1 });
  1286 |     },
  1287 |   );
  1288 | 
  1289 |   test(
  1290 |     'ANN-162: Verify that an admin who did not create the announcement cannot edit it through the edit URL',
  1291 |     tags,
  1292 |     async ({ page, api }) => {
  1293 |       const { id } = await sendByApi(api, { title: unique('QA edit URL') });
  1294 |       const announcements = new AnnouncementsPage(page);
  1295 |       await announcements.open(
  1296 |         process.env.ADMIN_B_EMAIL,
  1297 |         process.env.ADMIN_B_PASSWORD,
  1298 |       );
  1299 |       await announcements.openEdit(id);
  1300 |       // The app sends Admin B back to the details page (no edit form, no Edit button)
  1301 |       await expect(page).toHaveURL(new RegExp('/announcements/' + id + '$'));
  1302 |       await expect(
  1303 |         page.getByRole('heading', { name: 'Edit announcement' }),
  1304 |       ).toHaveCount(0);
  1305 |       await expect(announcements.reviewChanges).toHaveCount(0);
  1306 |       await expect(announcements.edit).toHaveCount(0);
  1307 |     },
  1308 |   );
  1309 | 
  1310 |   test(
  1311 |     'ANN-173, ANN-174, ANN-175, ANN-184, ANN-183: Verify the save summary, the default options, the saved message with View history, and Edited',
```