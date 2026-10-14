// Backup, Recovery & Migration Engine for Personal Finance Manager
// Strict Safety Rules Compliance:
// - Rule 5: Deletion or data reset strictly guarded by MIS Module Password
// - Rule 8: If import or restore fails validation, abort and explain problem
// - Rule 9: Never claim data is backed up unless created and verified
// - Rule 11: Passwords & secrets excluded from plain exported reports
// - Section 15: Mandatory pre-restore safety snapshot, preview modal & encryption

import { dbGetAll, dbPut, dbClear, dbCount, initDefaultData } from './db.js';
import { computeSHA256, encryptPayload, decryptPayload } from './security.js';
import { t } from './i18n.js';

export const BACKUP_SCHEMA_VERSION = 1;
export const APP_IDENTIFIER = 'Personal Finance Manager — Smart Offline Edition';
export const APP_VERSION = '1.0.0';

const FINANCIAL_STORES = [
  'accounts',
  'categories',
  'transactions',
  'audit_log',
  'budgets',
  'savings_goals',
  'savings_contributions',
  'lending',
  'borrowing',
  'loan_repayments',
  'settings'
];

// Helper: Formatted timestamp for filenames
function getTimestampString() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const d = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const t = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${d}_${t}`;
}

// 1. Generate Full Backup
export async function generateFullBackup({ encrypt = false, password = '', includeAuditLog = true } = {}) {
  const tables = {};
  const recordCounts = {};

  for (const storeName of FINANCIAL_STORES) {
    if (storeName === 'audit_log' && !includeAuditLog) {
      tables[storeName] = [];
      recordCounts[storeName] = 0;
      continue;
    }
    const records = await dbGetAll(storeName);
    tables[storeName] = records;
    recordCounts[storeName] = records.length;
  }

  const rawPayloadStr = JSON.stringify(tables);
  const checksum = await computeSHA256(rawPayloadStr);
  const nowStr = new Date().toISOString();

  let envelope = null;

  if (encrypt) {
    if (!password || password.length < 6) {
      throw new Error(t('backupPasswordMinLength', 'Backup encryption password must be at least 6 characters.'));
    }
    const encResult = await encryptPayload(rawPayloadStr, password);
    envelope = {
      app: APP_IDENTIFIER,
      version: APP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: nowStr,
      isEncrypted: true,
      checksum: checksum, // Plaintext checksum
      encryption: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: 100000,
        salt: encResult.salt,
        iv: encResult.iv
      },
      recordCounts: recordCounts,
      payload: encResult.cipherText
    };
  } else {
    envelope = {
      app: APP_IDENTIFIER,
      version: APP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      createdAt: nowStr,
      isEncrypted: false,
      checksum: checksum,
      recordCounts: recordCounts,
      payload: tables
    };
  }

  // Strict Rule 9 Verification: Validate envelope before claiming success
  const jsonString = JSON.stringify(envelope, null, 2);
  const validation = await validateBackupFile(jsonString, password);
  if (!validation.isValid) {
    throw new Error(`Backup verification failed before download: ${validation.error}`);
  }

  return {
    envelope,
    jsonString,
    recordCounts,
    filename: `PFM_Backup_${getTimestampString()}.${encrypt ? 'pfmbak' : 'json'}`
  };
}

// Helper: Trigger browser file download
export function triggerBackupDownload(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// 2. Validate Backup File (Pre-Restore Inspection)
export async function validateBackupFile(fileContentStr, password = '') {
  try {
    if (!fileContentStr || typeof fileContentStr !== 'string') {
      return { isValid: false, error: t('invalidFileFormat', 'File content is empty or invalid.') };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(fileContentStr);
    } catch (e) {
      return { isValid: false, error: t('jsonParseError', 'Corrupted file: Invalid JSON format.') };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: t('invalidBackupEnvelope', 'Invalid backup file structure.') };
    }

    if (!parsed.app || !parsed.app.includes('Personal Finance Manager')) {
      return { isValid: false, error: t('unsupportedAppBackup', 'File is not a valid Personal Finance Manager backup.') };
    }

    if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      return {
        isValid: false,
        error: `${t('unsupportedSchema', 'Unsupported backup schema version')}: ${parsed.schemaVersion}`
      };
    }

    if (!parsed.createdAt || !parsed.checksum) {
      return { isValid: false, error: t('missingBackupMetadata', 'Missing required backup metadata headers.') };
    }

    let tables = null;

    if (parsed.isEncrypted) {
      if (!password) {
        return {
          isValid: false,
          isEncrypted: true,
          error: t('passwordRequiredForDecryption', 'This backup is encrypted. Password is required.')
        };
      }

      if (!parsed.encryption || !parsed.encryption.salt || !parsed.encryption.iv || !parsed.payload) {
        return { isValid: false, error: t('corruptedEncryptedBackup', 'Corrupted encrypted backup parameters.') };
      }

      let decryptedStr = null;
      try {
        decryptedStr = await decryptPayload(
          {
            salt: parsed.encryption.salt,
            iv: parsed.encryption.iv,
            cipherText: parsed.payload
          },
          password
        );
      } catch (err) {
        return {
          isValid: false,
          isEncrypted: true,
          error: t('decryptionFailedWrongPassword', 'Decryption failed: Incorrect password or damaged file.')
        };
      }

      // Verify SHA-256 Checksum
      const computedChecksum = await computeSHA256(decryptedStr);
      if (computedChecksum !== parsed.checksum) {
        return {
          isValid: false,
          error: t('checksumMismatch', 'Security Integrity Error: Backup checksum mismatch! File has been tampered with or corrupted.')
        };
      }

      try {
        tables = JSON.parse(decryptedStr);
      } catch (e) {
        return { isValid: false, error: t('corruptedDecryptedData', 'Decrypted data is not valid JSON.') };
      }
    } else {
      // Plain backup
      tables = parsed.payload;
      if (!tables || typeof tables !== 'object') {
        return { isValid: false, error: t('missingPayload', 'Backup contains no financial tables payload.') };
      }

      const serialized = JSON.stringify(tables);
      const computedChecksum = await computeSHA256(serialized);
      if (computedChecksum !== parsed.checksum) {
        return {
          isValid: false,
          error: t('checksumMismatch', 'Security Integrity Error: Checksum mismatch! File has been tampered with or corrupted.')
        };
      }
    }

    // Required Table Sanity Checks
    const requiredTables = ['accounts', 'categories', 'transactions'];
    for (const req of requiredTables) {
      if (!Array.isArray(tables[req])) {
        return {
          isValid: false,
          error: `${t('missingRequiredTable', 'Missing essential financial table')}: ${req}`
        };
      }
    }

    // Mathematical integrity of transactions in backup
    for (const tx of tables.transactions) {
      if (!tx.id || !tx.type || !Number.isInteger(tx.amountPaisa) || tx.amountPaisa <= 0) {
        return {
          isValid: false,
          error: t('corruptedTransactionData', 'Backup contains malformed or unverified transaction records.')
        };
      }
    }

    const recordCounts = {};
    for (const k of FINANCIAL_STORES) {
      recordCounts[k] = Array.isArray(tables[k]) ? tables[k].length : 0;
    }

    return {
      isValid: true,
      isEncrypted: !!parsed.isEncrypted,
      metadata: {
        app: parsed.app,
        version: parsed.version,
        schemaVersion: parsed.schemaVersion,
        createdAt: parsed.createdAt,
        checksum: parsed.checksum
      },
      recordCounts: recordCounts,
      tables: tables
    };
  } catch (e) {
    return { isValid: false, error: e.message || 'Unknown backup validation error' };
  }
}

// 3. Mandatory Safety Pre-Restore Snapshot (Rule 15 & Section 15)
// Automatically downloads current live state before applying restore
export async function createPreRestoreEmergencyBackup() {
  const liveBackup = await generateFullBackup({ encrypt: false, includeAuditLog: true });
  const filename = `PFM_Emergency_PreRestore_Backup_${getTimestampString()}.json`;
  triggerBackupDownload(liveBackup.jsonString, filename);
  return liveBackup;
}

// 4. Restore Database from Verified Backup
export async function restoreBackupData(verifiedTables) {
  if (!verifiedTables || typeof verifiedTables !== 'object') {
    throw new Error('Cannot restore: Verified tables object is missing.');
  }

  const restoredCounts = {};

  // Step 1: Wipe financial stores cleanly
  for (const storeName of FINANCIAL_STORES) {
    await dbClear(storeName);
  }

  // Step 2: Insert verified records into each store
  for (const storeName of FINANCIAL_STORES) {
    const records = verifiedTables[storeName];
    if (Array.isArray(records)) {
      for (const record of records) {
        await dbPut(storeName, record);
      }
      restoredCounts[storeName] = records.length;
    } else {
      restoredCounts[storeName] = 0;
    }
  }

  // Step 3: Record Restore Audit Trail Entry
  const auditEntry = {
    id: `audit_restore_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    action: 'RESTORE_DATABASE',
    timestamp: new Date().toISOString(),
    restoredCounts: restoredCounts
  };
  await dbPut('audit_log', auditEntry);

  return {
    success: true,
    restoredCounts: restoredCounts
  };
}

// 5. Reset All Financial Data (Guarded strictly by Rule 5 MIS Password)
export async function resetAllFinancialDataWithMIS(misVerified = false) {
  if (!misVerified) {
    throw new Error('Rule 5 Violation: Resetting financial database strictly requires verified MIS Module Password.');
  }

  // Clear all transactional, budget, loan, and savings data
  const storesToReset = [
    'transactions',
    'budgets',
    'savings_goals',
    'savings_contributions',
    'lending',
    'borrowing',
    'loan_repayments',
    'audit_log'
  ];

  for (const s of storesToReset) {
    await dbClear(s);
  }

  // Reset account balances to 0 without deleting account configurations
  const accounts = await dbGetAll('accounts');
  for (const acc of accounts) {
    acc.opening_balance_paisa = 0;
    acc.current_balance_paisa = 0;
    acc.updatedAt = new Date().toISOString();
    await dbPut('accounts', acc);
  }

  // Record Audit Entry
  const auditEntry = {
    id: `audit_reset_${Date.now()}`,
    action: 'DATABASE_RESET',
    timestamp: new Date().toISOString(),
    verifiedBy: 'MIS_MODULE'
  };
  await dbPut('audit_log', auditEntry);

  return true;
}

// 6. Current Database Storage Statistics
export async function getStorageStatistics() {
  const counts = {};
  let totalRecords = 0;

  for (const s of FINANCIAL_STORES) {
    const c = await dbCount(s);
    counts[s] = c;
    totalRecords += c;
  }

  // Estimate storage size based on JSON serialization
  let estimatedSizeBytes = 0;
  for (const s of FINANCIAL_STORES) {
    const items = await dbGetAll(s);
    estimatedSizeBytes += JSON.stringify(items).length;
  }

  return {
    counts,
    totalRecords,
    estimatedSizeBytes,
    estimatedSizeKb: (estimatedSizeBytes / 1024).toFixed(2),
    timestamp: new Date().toISOString()
  };
}
