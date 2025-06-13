// src/services/utils.ts

/**
 * Processes nested Supabase join data that might be a single object or an array containing one object.
 * @param relationData The data from the Supabase join.
 * @returns The single nested object, or null if no data.
 */
export const processSingleNestedRelation = <T>(
  relationData: T | T[] | null | undefined
): T | null => {
  if (!relationData) return null;
  if (Array.isArray(relationData)) {
    return relationData.length > 0 ? relationData[0] : null;
  }
  return relationData; // It's already a single object
};
