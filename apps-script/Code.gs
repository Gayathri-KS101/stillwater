// Fragile Whispers — Google Apps Script
// Paste this into your Apps Script editor and re-deploy as a Web App
// (Execute as: Me | Who has access: Anyone)

const SHEET_NAME = "Sheet1";
const RAW_COL    = 10; // Column J — stores the full JSON payload for easy re-reading

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const lastRow = sheet.getLastRow();

    // No data rows yet (row 1 is the header)
    if (lastRow <= 1) {
      return jsonResponse([]);
    }

    // Read column J (index RAW_COL) for every data row
    const rawRange = sheet.getRange(2, RAW_COL, lastRow - 1, 1).getValues();
    const entries = [];

    for (const [cell] of rawRange) {
      if (!cell) continue;
      try {
        entries.push(JSON.parse(cell));
      } catch (_) {
        // skip malformed rows
      }
    }

    return jsonResponse(entries);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const entry = JSON.parse(e.postData.contents);
    const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // --- Ensure header row exists ---
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Date", "Time", "Moods", "Intensity",
        "Journal", "Thoughts", "Origin", "Body", "Helped",
        "raw"          // Column J — full JSON for read-back
      ]);
    }

    // --- Check for existing row with the same id and update it ---
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const idValues = sheet.getRange(2, RAW_COL, lastRow - 1, 1).getValues();
      for (let i = 0; i < idValues.length; i++) {
        try {
          const existing = JSON.parse(idValues[i][0]);
          if (existing.id === entry.id) {
            // Update in place
            const rowNum = i + 2;
            writeRowValues(sheet, rowNum, entry);
            return jsonResponse({ status: "updated", id: entry.id });
          }
        } catch (_) {}
      }
    }

    // --- Append as a new row ---
    const rowNum = sheet.getLastRow() + 1;
    sheet.insertRowAfter(sheet.getLastRow());
    writeRowValues(sheet, rowNum, entry);

    return jsonResponse({ status: "created", id: entry.id });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeRowValues(sheet, rowNum, entry) {
  const createdDate = entry.createdAt ? new Date(entry.createdAt) : new Date();
  sheet.getRange(rowNum, 1, 1, 10).setValues([[
    Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "d/M/yyyy"),
    Utilities.formatDate(createdDate, Session.getScriptTimeZone(), "h:mm a"),
    (entry.moods  || []).join(", "),
    entry.intensity ?? "",
    entry.journal  || "",
    entry.thoughts || "",
    entry.origin   || "",
    (entry.body    || []).join(", "),
    (entry.helped  || []).join(", "),
    JSON.stringify(entry)   // Column J — raw JSON for GET read-back
  ]]);
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
