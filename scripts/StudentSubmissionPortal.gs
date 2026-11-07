/**
 * =========================================================================
 * Student Submission Portal - Resilient Google Apps Script Backend
 * Target Google Drive Folder ID: 1IewvX8KRtt0nmRp7ZV8X8D_J_tkZn2uiL
 * Deploy as Web App: Execute as Me, Who has access: Anyone
 * Then paste the /exec URL into google-apps-script-config.json -> webAppUrl
 * =========================================================================
 */

var DEFAULT_FOLDER_ID = "1IewvX8KRtt0nmRp7ZV8X8D_J_tkZn2uiL";

function cleanFolderId(input) {
  if (!input) return DEFAULT_FOLDER_ID;
  var str = ("" + input).trim();
  var match = str.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  var idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];
  return str.replace(/https?:\/\/[^/]+\//, "").replace(/\//g, "").trim();
}

function getTargetFolder(rawFolderId) {
  var cleanId = cleanFolderId(rawFolderId || DEFAULT_FOLDER_ID);
  var effectiveEmail = "";
  try {
    effectiveEmail = Session.getEffectiveUser().getEmail();
  } catch (e) {}

  try {
    var folder = DriveApp.getFolderById(cleanId);
    return {
      folder: folder,
      folderId: cleanId,
      folderName: folder.getName(),
      fallback: false,
      effectiveEmail: effectiveEmail
    };
  } catch (err) {
    var folderName = "Student Submissions";
    var existing = DriveApp.getFoldersByName(folderName);
    var fallbackFolder = existing.hasNext() ? existing.next() : DriveApp.createFolder(folderName);

    return {
      folder: fallbackFolder,
      folderId: fallbackFolder.getId(),
      folderName: fallbackFolder.getName(),
      fallback: true,
      requestedFolderId: cleanId,
      effectiveEmail: effectiveEmail,
      warning: "Target folder ID (" + cleanId + ") was not accessible to account [" + (effectiveEmail || "current user") + "]. Upload was safely saved in folder '" + folderName + "'."
    };
  }
}

function doGet(e) {
  try {
    var folderResult = getTargetFolder(e && e.parameter ? e.parameter.folderId : DEFAULT_FOLDER_ID);
    var response = {
      status: "ready",
      message: folderResult.fallback
        ? folderResult.warning
        : "Student Submission Portal backend is active and connected to Drive.",
      folderId: folderResult.folderId,
      folderName: folderResult.folderName,
      fallbackUsed: folderResult.fallback,
      effectiveEmail: folderResult.effectiveEmail,
      targetFolderId: DEFAULT_FOLDER_ID,
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Diagnostics error: " + err.toString(),
      targetFolderId: DEFAULT_FOLDER_ID
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || (!e.postData && !e.parameter)) {
      throw new Error("No data received in POST request.");
    }

    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e.parameter) {
      payload = e.parameter;
    }

    var studentName = (payload.studentName || payload.name || "").trim();
    var originalFilename = (payload.filename || payload.fileName || "submission").trim();
    var base64Data = payload.fileData || payload.base64 || "";
    var mimeType = payload.mimeType || "application/octet-stream";
    var requestedFolderId = payload.folderId || DEFAULT_FOLDER_ID;

    if (!studentName) {
      throw new Error("Student Full Name is required.");
    }
    if (!base64Data) {
      throw new Error("No file content received.");
    }

    if (base64Data.indexOf("base64,") !== -1) {
      base64Data = base64Data.split("base64,")[1];
    }

    var cleanStudentName = studentName
      .replace(/[\\/:*?"<>|#%&{}\\$!'@+`=]/g, "")
      .replace(/\s+/g, "_")
      .trim();

    if (!cleanStudentName) {
      cleanStudentName = "Student";
    }

    var lastDotIndex = originalFilename.lastIndexOf(".");
    var baseName = originalFilename;
    var extension = "";
    if (lastDotIndex > 0) {
      baseName = originalFilename.substring(0, lastDotIndex);
      extension = originalFilename.substring(lastDotIndex);
    }

    var cleanBaseName = baseName
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim();

    var targetFilename = cleanBaseName + "_" + cleanStudentName + extension;
    var folderResult = getTargetFolder(requestedFolderId);
    var folder = folderResult.folder;

    var existingFiles = folder.getFilesByName(targetFilename);
    if (existingFiles.hasNext()) {
      var timeFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "UTC", "yyyyMMdd_HHmmss");
      targetFilename = cleanBaseName + "_" + cleanStudentName + "_" + timeFormatted + extension;
    }

    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, targetFilename);
    var createdFile = folder.createFile(blob);

    var successResponse = {
      status: "success",
      message: folderResult.fallback
        ? "File uploaded to Drive in folder '" + folderResult.folderName + "'. (" + folderResult.warning + ")"
        : "File successfully uploaded and saved to Google Drive.",
      fileId: createdFile.getId(),
      filename: targetFilename,
      originalFilename: originalFilename,
      studentName: studentName,
      fileSize: createdFile.getSize(),
      fileUrl: createdFile.getUrl(),
      folderId: folderResult.folderId,
      folderName: folderResult.folderName,
      fallbackUsed: folderResult.fallback,
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(successResponse))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResponse = {
      status: "error",
      message: err.message || err.toString(),
      timestamp: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
