/**
 * Deploy this file as the profile-picture Apps Script web app (execute as owner).
 * Set Script Properties > GOOGLE_DRIVE_API_SECRET to the same high-entropy value
 * configured in Vercel. Only the server calls this script.
 * Profile Pictures is created inside the existing Drive folder below.
 */
var PROFILE_PARENT_FOLDER_ID = '1IewvX8KRtt0nmRp7ZV8X8D_J_tkZn2uiL';
var PROFILE_SUBFOLDER_NAME = 'Profile Pictures';
var PROFILE_MAX_BYTES = 2 * 1024 * 1024;

function profileResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function profileFolder() {
  var parent = DriveApp.getFolderById(PROFILE_PARENT_FOLDER_ID);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var folders = parent.getFoldersByName(PROFILE_SUBFOLDER_NAME);
    return folders.hasNext() ? folders.next() : parent.createFolder(PROFILE_SUBFOLDER_NAME);
  } finally {
    lock.releaseLock();
  }
}
function profileMimeIsValid(bytes, mimeType) {
  if (mimeType === 'image/jpeg') return bytes.length > 3 && bytes[0] === -1 && bytes[1] === -40 && bytes[2] === -1;
  if (mimeType === 'image/png') return bytes.length > 8 && bytes[0] === -119 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  if (mimeType === 'image/webp') return bytes.length > 12 && Utilities.newBlob(bytes.slice(0, 4)).getDataAsString() === 'RIFF' && Utilities.newBlob(bytes.slice(8, 12)).getDataAsString() === 'WEBP';
  return false;
}
function profileUpload(payload, ownerId) {
  var mimeType = String(payload.mimeType || '');
  var base64 = String(payload.fileData || '');
  if (!base64 || base64.length > 2800000) throw new Error('Invalid image data.');
  var bytes = Utilities.base64Decode(base64);
  if (!bytes.length || bytes.length > PROFILE_MAX_BYTES || !profileMimeIsValid(bytes, mimeType)) throw new Error('Choose a JPG, PNG, or WEBP image no larger than 2 MB.');
  var extension = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : '.webp';
  var filename = ownerId + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000000) + extension;
  var file = profileFolder().createFile(Utilities.newBlob(bytes, mimeType, filename));
  try {
    file.setDescription('ths-profile-owner:' + ownerId);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    file.setTrashed(true);
    throw new Error('Could not make the profile image viewable.');
  }
  return { status: 'success', operation: 'upload', fileId: file.getId(), imageUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w512' };
}
function profileDelete(payload, ownerId) {
  var fileId = String(payload.fileId || '');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(fileId)) throw new Error('Invalid file ID.');
  var file = DriveApp.getFileById(fileId);
  if (file.getDescription() !== 'ths-profile-owner:' + ownerId) throw new Error('This file does not belong to this account.');
  var folderId = profileFolder().getId();
  var parents = file.getParents();
  var inProfileFolder = false;
  while (parents.hasNext()) if (parents.next().getId() === folderId) inProfileFolder = true;
  if (!inProfileFolder) throw new Error('File is outside the profile-picture folder.');
  file.setTrashed(true);
  return { status: 'success', operation: 'delete', fileId: fileId };
}
function doGet() {
  return profileResponse({ status: 'ready', service: 'profile-pictures' });
}
function doPost(event) {
  try {
    var payload = JSON.parse(event && event.postData ? event.postData.contents : '{}');
    var storedSecret = PropertiesService.getScriptProperties().getProperty('GOOGLE_DRIVE_API_SECRET');
    if (!storedSecret || storedSecret.length < 32 || payload.secret !== storedSecret) throw new Error('Unauthorized request.');
    var ownerId = String(payload.ownerId || payload.studentId || '');
    if (!/^(std_|t_)[A-Za-z0-9_-]{3,90}$/.test(ownerId)) throw new Error('Invalid profile owner ID.');
    if (payload.operation === 'upload') return profileResponse(profileUpload(payload, ownerId));
    if (payload.operation === 'delete') return profileResponse(profileDelete(payload, ownerId));
    throw new Error('Unsupported operation.');
  } catch (error) {
    return profileResponse({ status: 'error', message: error && error.message ? error.message : 'Profile picture request failed.' });
  }
}
