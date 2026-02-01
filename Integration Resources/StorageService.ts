import AsyncStorage from '@react-native-async-storage/async-storage';

export type PatientName = { firstName: string; lastName: string };

const PATIENT_NAMES_KEY = '@patient_names';

/**
 * Lightweight StorageService used by Integration Resources.
 * Provides minimal patient-name methods required by MedicationDatabase and AuthService.
 */
export const StorageService = {
  async getPatientNames(): Promise<PatientName[]> {
    try {
      const json = await AsyncStorage.getItem(PATIENT_NAMES_KEY);
      if (!json) return [];
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((p: any) => ({
        firstName: String(p.firstName || p.first_name || p.first),
        lastName: String(p.lastName || p.last_name || p.last),
      }));
    } catch (error) {
      console.error('StorageService.getPatientNames error:', error);
      return [];
    }
  },

  async setPatientNames(list: PatientName[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PATIENT_NAMES_KEY, JSON.stringify(list || []));
    } catch (error) {
      console.error('StorageService.setPatientNames error:', error);
    }
  },

  async isKnownPatientName(firstName: string, lastName: string): Promise<boolean> {
    try {
      const normalizedFirst = (firstName || '').trim().toUpperCase();
      const normalizedLast = (lastName || '').trim().toUpperCase();

      const patients = await this.getPatientNames();
      if (!patients || patients.length === 0) return false;

      for (const p of patients) {
        const f = (p.firstName || '').trim().toUpperCase();
        const l = (p.lastName || '').trim().toUpperCase();
        if (f === normalizedFirst && l === normalizedLast) return true;
        // Simple fuzzy: startsWith first 3 chars and startsWith last 3 chars
        if (
          normalizedFirst.length >= 3 &&
          normalizedLast.length >= 3 &&
          f.startsWith(normalizedFirst.substring(0, 3)) &&
          l.startsWith(normalizedLast.substring(0, 3))
        ) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('StorageService.isKnownPatientName error:', error);
      return false;
    }
  },
};
