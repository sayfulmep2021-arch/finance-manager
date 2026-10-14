// Security & Cryptographic Gate for Personal Finance Manager
// Web Crypto API PBKDF2-SHA256 Implementation
// Enforces Strict MIS Password Deletion Rule (Rule 5 & Section 17)

import { dbGet, dbPut } from './db.js';
import { t } from './i18n.js';

const MIS_CONFIG_KEY = 'mis_config';
const APP_LOCK_KEY = 'app_lock_config';
const PBKDF2_ITERATIONS = 100000;

// Helper: Convert ArrayBuffer to Hex String
function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Hex String to Uint8Array
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Derive PBKDF2-SHA256 Hash using native Web Crypto API
async function derivePBKDF2Hash(password, saltBuffer) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedBits);
}

// 1. MIS Password Status Check
export async function getMISStatus() {
  const config = await dbGet('security', MIS_CONFIG_KEY);
  return {
    isConfigured: !!(config && config.isConfigured && config.hash && config.salt),
    updatedAt: config ? config.updatedAt : null
  };
}

// 2. Setup MIS Module Password
export async function setupMISPassword(password, confirmPassword) {
  if (!password || password.length < 6) {
    throw new Error(t('misErrorLength', 'Password must be at least 6 characters.'));
  }
  if (password !== confirmPassword) {
    throw new Error(t('misErrorMismatch', 'Passwords do not match.'));
  }

  // Generate 16 bytes random cryptographic salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePBKDF2Hash(password, salt);

  const config = {
    key: MIS_CONFIG_KEY,
    hash: hash,
    salt: bufferToHex(salt),
    isConfigured: true,
    updatedAt: new Date().toISOString()
  };

  await dbPut('security', config);
  window.dispatchEvent(new CustomEvent('pfm_mis_status_changed', { detail: { isConfigured: true } }));
  return true;
}

// 3. Verify MIS Password
export async function verifyMISPassword(inputPassword) {
  if (!inputPassword) return false;

  const config = await dbGet('security', MIS_CONFIG_KEY);
  if (!config || !config.isConfigured || !config.hash || !config.salt) {
    return false;
  }

  const saltBuffer = hexToBuffer(config.salt);
  const computedHash = await derivePBKDF2Hash(inputPassword, saltBuffer);

  // Constant-time length and equality check
  if (computedHash.length !== config.hash.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ config.hash.charCodeAt(i);
  }

  return diff === 0;
}

// 4. Change MIS Password (requires current password verification first)
export async function changeMISPassword(currentPassword, newPassword, confirmPassword) {
  const isCurrentValid = await verifyMISPassword(currentPassword);
  if (!isCurrentValid) {
    throw new Error(t('misErrorWrong', 'Incorrect MIS password!'));
  }
  return setupMISPassword(newPassword, confirmPassword);
}

// 5. MIS Deletion Guard Modal Prompt
// Presents a secure dialog requiring MIS Module password before any deletion
export function requestMISAuthorization(actionDescription = '') {
  return new Promise(async (resolve, reject) => {
    const misStatus = await getMISStatus();

    // If MIS password is not configured, Rule 5 mandates deletion remains disabled!
    if (!misStatus.isConfigured) {
      alert(t('misDeletionDisabledNotice', 'Deletion is disabled: Please set up your MIS Module password first.'));
      // Trigger MIS setup modal
      openMISSetupModal();
      resolve(false);
      return;
    }

    const modal = document.getElementById('mis-verify-modal');
    if (!modal) {
      // In non-DOM environment (e.g., automated test), fallback gracefully if direct function is tested
      resolve(false);
      return;
    }

    const passInput = document.getElementById('mis-verify-password-input');
    const descEl = document.getElementById('mis-verify-desc');
    const errorEl = document.getElementById('mis-verify-error');
    const confirmBtn = document.getElementById('mis-btn-confirm-delete');
    const cancelBtn = document.getElementById('mis-btn-cancel-delete');

    passInput.value = '';
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    descEl.textContent = actionDescription || t('misWarningDelete');
    modal.classList.remove('hidden');
    passInput.focus();

    const cleanup = () => {
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.classList.add('hidden');
    };

    confirmBtn.onclick = async () => {
      const enteredPassword = passInput.value.trim();
      if (!enteredPassword) {
        errorEl.textContent = t('fieldRequired');
        errorEl.classList.remove('hidden');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = '...';

      try {
        const isValid = await verifyMISPassword(enteredPassword);
        if (isValid) {
          cleanup();
          resolve(true);
        } else {
          errorEl.textContent = t('misErrorWrong');
          errorEl.classList.remove('hidden');
          passInput.value = '';
          passInput.focus();
        }
      } catch (err) {
        errorEl.textContent = err.message || t('errorOccurred');
        errorEl.classList.remove('hidden');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = t('misBtnVerifyDelete');
      }
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

// 6. MIS Setup Modal Helper
export function openMISSetupModal() {
  const modal = document.getElementById('mis-setup-modal');
  if (modal) {
    const newPass = document.getElementById('mis-setup-new-password');
    const confirmPass = document.getElementById('mis-setup-confirm-password');
    const errEl = document.getElementById('mis-setup-error');
    if (newPass) newPass.value = '';
    if (confirmPass) confirmPass.value = '';
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    if (newPass) newPass.focus();
  }
}

// 7. Compute SHA-256 Checksum (Native Web Crypto API)
export async function computeSHA256(text) {
  const enc = new TextEncoder();
  const buffer = await window.crypto.subtle.digest('SHA-256', enc.encode(text));
  return bufferToHex(buffer);
}

// 8. Authenticated Encryption with AES-256-GCM & PBKDF2
export async function encryptPayload(plainText, password) {
  if (!password || password.length === 0) {
    throw new Error('Encryption password is required');
  }

  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV standard for AES-GCM

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    aesKey,
    enc.encode(plainText)
  );

  return {
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    cipherText: bufferToHex(cipherBuffer)
  };
}

// 9. Authenticated Decryption with AES-256-GCM & PBKDF2
export async function decryptPayload({ salt, iv, cipherText }, password) {
  if (!password || password.length === 0) {
    throw new Error('Decryption password is required');
  }

  const enc = new TextEncoder();
  const saltBuf = hexToBuffer(salt);
  const ivBuf = hexToBuffer(iv);
  const cipherBuf = hexToBuffer(cipherText);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  try {
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuf },
      aesKey,
      cipherBuf
    );
    const dec = new TextDecoder();
    return dec.decode(plainBuffer);
  } catch (e) {
    throw new Error('Decryption failed. Incorrect password or corrupted backup file.');
  }
}
