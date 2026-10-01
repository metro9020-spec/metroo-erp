import { Client, Databases, Storage, Account, Query, ID, Permission, Role, AppwriteException } from "appwrite";

export const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "6abbaed6002fd9bf3d58";
export const APPWRITE_DATABASE_ID = "metro_erp_db";

export const APPWRITE_STORAGE_BUCKET = "erp_databases";

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);
export const appwriteAccount = new Account(appwriteClient);
export { Query, ID, Permission, Role, AppwriteException };

export function sanitizeAppwriteId(str) {
  if (!str) return ID.unique();
  const clean = String(str).replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
  return clean || ID.unique();
}
