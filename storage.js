import { STORAGE_KEYS, DEFAULT_SETTINGS } from './utils.js';

export async function ensureDefaults(){
  const d=await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  await chrome.storage.local.set({[STORAGE_KEYS.SETTINGS]:{...DEFAULT_SETTINGS,...(d[STORAGE_KEYS.SETTINGS]||{})}});
}
export const getMany=async(keys)=>chrome.storage.local.get(keys);
export const setMany=async(obj)=>chrome.storage.local.set(obj);
export async function disconnectAndClear(){
  await chrome.storage.local.remove([STORAGE_KEYS.AUTH,STORAGE_KEYS.USER,STORAGE_KEYS.ASSIGNMENTS,STORAGE_KEYS.COURSES,STORAGE_KEYS.NOTIFICATIONS_SENT,STORAGE_KEYS.LAST_SYNC_AT]);
}
