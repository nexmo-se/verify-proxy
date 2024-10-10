import { vcr } from '@vonage/vcr-sdk';

const DB_TABLENAME_WHITELIST = 'DB_TABLENAME_WHITELIST';

export const isNumberWhitelisted = async (number) => {
  try {
    const db = vcr.getInstanceState();
    const isWhitelisted = await db.mapGetValue(DB_TABLENAME_WHITELIST, number.toString());
    return isWhitelisted || false;
  } catch (error) {
    console.error(`Error checking if number is whitelisted: ${error.message}`);
    throw new Error('Failed to check whitelist status.');
  }
};
