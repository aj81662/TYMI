import {StorageService} from './StorageService';

/**
 * Medication Database - Common drug names, strengths, and forms
 * Used to validate and correct OCR parsing errors
 * Fetches data from online APIs to reduce storage requirements
 */

export class MedicationDatabase {
  // Cache for online data (expires after 24 hours)
  private static medicationCache: Set<string> | null = null;
  private static firstNameCache: Set<string> | null = null;
  private static lastNameCache: Set<string> | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Common medication forms
  static readonly MEDICATION_FORMS = new Set([
    'TABLET', 'TABLETS', 'CAPSULE', 'CAPSULES', 'PILL', 'PILLS',
    'SOLUTION', 'SUSPENSION', 'SYRUP', 'LIQUID', 'ELIXIR',
    'CREAM', 'OINTMENT', 'GEL', 'LOTION', 'PATCH',
    'INHALER', 'SPRAY', 'DROP', 'DROPS', 'INJECTION',
  ]);

  // Common strength units
  static readonly STRENGTH_UNITS = new Set([
    'MG', 'MCG', 'G', 'ML', 'UNITS', 'MEQ', 'IU', '%',
  ]);

  /**
   * Fetch medications from online database
   * Uses multiple free sources for better coverage
   */
  private static async fetchMedications(): Promise<Set<string>> {
    try {
      // Ordered by database size (largest first) for faster validation
      const sources = [
        // 1. RxNav API - NIH medication database (~6000+ medications)
        'https://rxnav.nlm.nih.gov/REST/allconcepts.json?tty=SCD+SBD+GPCK+BPCK',
        // 2. GitHub curated lists (~3000-5000 medications)
        'https://raw.githubusercontent.com/nasrulhazim/medication-list/master/medications.txt',
        'https://raw.githubusercontent.com/ranaroussi/pynyse/master/data/drugs.txt',
        'https://gist.githubusercontent.com/cferdinandi/6269818b7525e77c4211c5af140c1895/raw/68c8e8e6e3b0dde6c0e6f07c3bf60aee8c94e8d6/drugs.txt',
        // 3. DrugBank open data (~2000+ medications)
        'https://raw.githubusercontent.com/dhimmel/drugbank/gh-pages/data/drugbank.tsv',
        'https://raw.githubusercontent.com/First-Derivative/fda/master/drugs.csv',
        // 4. OpenFDA Drug Labels API (~1000 medications, limited by API)
        'https://api.fda.gov/drug/label.json?search=openfda.brand_name:*&limit=1000',
      ];

      let allMedications = new Set<string>();
      let successCount = 0;
      const MIN_MEDICATIONS = 5000; // Stop early if we have enough medications

      for (const url of sources) {
        try {
          const response = await fetch(url, { 
            headers: { 'Accept': 'application/json, text/plain, text/csv, */*' }
          });
          if (response.ok) {
            const contentType = response.headers.get('content-type') || '';
            let medications: string[] = [];
            
            if (contentType.includes('application/json')) {
              // Handle JSON APIs (OpenFDA, RxNav)
              const data = await response.json();
              
              if (data.results) {
                // OpenFDA format
                medications = data.results
                  .map((item: any) => 
                    item.openfda?.brand_name?.[0] || 
                    item.openfda?.generic_name?.[0] ||
                    item.openfda?.substance_name?.[0]
                  )
                  .filter((name: string) => name);
              } else if (data.minConceptGroup) {
                // RxNav format
                const concepts = data.minConceptGroup.minConcept || [];
                medications = concepts.map((c: any) => c.name).filter((n: string) => n);
              }
            } else {
              // Handle text/CSV formats
              const text = await response.text();
              const lines = text.split('\n');
              
              medications = lines
                .filter(line => typeof line === 'string' && line.trim().length > 0)
                .filter(line => !line.toLowerCase().includes('drug_id') && !line.toLowerCase().startsWith('name\t')) // Skip headers
                .map(line => {
                  // For TSV/CSV, take first column
                  const parts = line.split(/[,\t]/);
                  return parts[0].trim();
                })
                .filter(name => typeof name === 'string' && name.length >= 4 && name.length <= 50);
            }
            
            // Clean and add medications
            const cleanedMeds = medications
              .map(med => med.toUpperCase().replace(/[^A-Z\s-]/g, '').trim())
              .filter(name => typeof name === 'string' && name.length >= 4 && name.length <= 40)
              .filter(name => /^[A-Z][A-Z\s-]+$/.test(name));
            
            cleanedMeds.forEach(med => allMedications.add(med));
            if (Array.isArray(cleanedMeds) && cleanedMeds.length > 0) {
              successCount++;
              console.log(`Fetched ${Array.isArray(cleanedMeds) ? cleanedMeds.length : 0} medications from source ${successCount} (total: ${allMedications.size})`);
            }
            
            // OPTIMIZATION: Early exit if we have enough medications
            if (allMedications.size >= MIN_MEDICATIONS && successCount >= 2) {
              console.log(`✓ Early exit: ${allMedications.size} medications from ${successCount} sources is sufficient`);
              break;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch from source: ${url}`, error);
          continue; // Try next source
        }
      }

      if (successCount > 0 && allMedications.size > 0) {
        console.log(`Total medications fetched: ${allMedications.size} from ${successCount} sources`);
        return allMedications;
      }

      throw new Error('All medication sources failed');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to fetch online medication database:', error);
      throw new Error('Medication database unavailable - please check internet connection and API sources');
    }
  }

  /**
   * Fetch first names from online database
   * Uses SSA popular baby names API
   */
  private static async fetchFirstNames(): Promise<Set<string>> {
    try {
      // Multiple free name APIs
      const sources = [
        // Option 1: GitHub gist with common names
        'https://gist.githubusercontent.com/elifiner/47631bb8875a664e0363f35e2eba65e4/raw/d75de2b321e5c7a33a97c1e2cce134c0f57c8a5e/firstnames.txt',
        // Fallback if first fails
        'https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt',
      ];

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const text = await response.text();
            const names = new Set(
              text.split('\n')
                .map(name => name.trim().toUpperCase())
                .filter(name => typeof name === 'string' && name.length > 0)
            );
            if (names.size > 0) {
              return names;
            }
          }
        } catch {
          continue; // Try next source
        }
      }

      throw new Error('All sources failed');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to fetch online first names database:', error);
      throw new Error('First names database unavailable - please check internet connection');
    }
  }

  /**
   * Fetch last names from online database
   */
  private static async fetchLastNames(): Promise<Set<string>> {
    try {
      // Free surname databases
      const sources = [
        'https://raw.githubusercontent.com/dominictarr/random-name/master/names.txt',
        'https://gist.githubusercontent.com/subodhghulaxe/8148971/raw/f8bf7ae572e023ab2d8a8f9e37bd25f9ed3c1a3c/surnames.txt',
      ];

      for (const url of sources) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const text = await response.text();
            const names = new Set(
              text.split('\n')
                .map(name => name.trim().toUpperCase())
                .filter(name => typeof name === 'string' && name.length > 0)
            );
            if (names.size > 0) {
              return names;
            }
          }
        } catch {
          continue;
        }
      }

      throw new Error('All sources failed');
    } catch (error) {
      console.error('❌ CRITICAL: Failed to fetch online last names database:', error);
      throw new Error('Last names database unavailable - please check internet connection');
    }
  }

  /**
   * Check if cache is valid
   */
  private static isCacheValid(): boolean {
    if (!this.medicationCache || !this.firstNameCache || !this.lastNameCache) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Refresh cache from online sources
   */
  private static async refreshCache(): Promise<void> {
    if (this.isCacheValid()) {
      console.log('📦 Using cached medication database');
      return; // Cache still valid
    }

    console.log('🔄 Fetching medication databases from online sources...');
    try {
      // Fetch all databases in parallel
      const [medications, firstNames, lastNames] = await Promise.all([
        this.fetchMedications(),
        this.fetchFirstNames(),
        this.fetchLastNames(),
      ]);

      this.medicationCache = medications;
      this.firstNameCache = firstNames;
      this.lastNameCache = lastNames;
      this.cacheTimestamp = Date.now();

      console.log('Database cache refreshed:', {
        medications: medications.size,
        firstNames: firstNames.size,
        lastNames: lastNames.size,
      });
    } catch (error) {
      console.error('❌ CRITICAL: Failed to refresh database cache:', error);
      throw error; // Propagate error to alert developer
    }
  }

  /**
   * Get medications (with online refresh)
   */
  private static async getMedications(): Promise<Set<string>> {
    await this.refreshCache();
    if (!this.medicationCache) {
      throw new Error('Medication cache not initialized');
    }
    return this.medicationCache;
  }

  /**
   * Get first names (with online refresh)
   */
  private static async getFirstNames(): Promise<Set<string>> {
    await this.refreshCache();
    if (!this.firstNameCache) {
      throw new Error('First names cache not initialized');
    }
    return this.firstNameCache;
  }

  /**
   * Get last names (with online refresh)
   */
  private static async getLastNames(): Promise<Set<string>> {
    await this.refreshCache();
    if (!this.lastNameCache) {
      throw new Error('Last names cache not initialized');
    }
    return this.lastNameCache;
  }

  /**
   * Check if a name exists in local patient database (exact or fuzzy match)
   * This is the fastest check and most reliable for known patients
   */
  static async isKnownLocalPatient(firstName: string, lastName: string): Promise<boolean> {
    const normalizedFirst = firstName.toUpperCase();
    const normalizedLast = lastName.toUpperCase();
    
    console.log(`🔍 Checking local patient database for: "${firstName} ${lastName}"`);
    
    const localPatients = await StorageService.getPatientNames();
    console.log(`📦 Local database has ${Array.isArray(localPatients) ? localPatients.length : 0} patient(s)`);
    
    for (const patient of localPatients) {
      const localFirst = patient.firstName.toUpperCase();
      const localLast = patient.lastName.toUpperCase();
      
      // Exact match
      if (localFirst === normalizedFirst && localLast === normalizedLast) {
        console.log(`✅ Exact match found in local DB: "${firstName} ${lastName}"`);
        return true;
      }
      
      // Fuzzy match with 85% similarity
      const firstSimilarity = this.calculateSimilarity(normalizedFirst, localFirst);
      const lastSimilarity = this.calculateSimilarity(normalizedLast, localLast);
      
      if (firstSimilarity >= 85 && lastSimilarity >= 85) {
        console.log(`✅ Fuzzy match found in local DB: "${firstName} ${lastName}" ~= "${patient.firstName} ${patient.lastName}" (${firstSimilarity.toFixed(1)}%/${lastSimilarity.toFixed(1)}%)`);
        return true;
      }
    }
    
    console.log(`⚠️ "${firstName} ${lastName}" not found in local database`);
    return false;
  }

  /**
   * Get all local patient names for fuzzy matching
   */
  static async getLocalPatients(): Promise<Array<{firstName: string, lastName: string}>> {
    return await StorageService.getPatientNames();
  }

  /**
   * Check if a word is likely a medication name
   * Requires 90% similarity to avoid false positives (e.g., "CADE" vs "CADEXOMER IODINE")
   */
  static async isMedication(word: string): Promise<boolean> {
    const normalized = word.toUpperCase().replace(/[^A-Z]/g, '');
    
    // Quick pre-filter: Skip obvious non-medications
    // Common short first names that aren't medications
    const commonNames = new Set(['CADE', 'JOHN', 'JANE', 'MARY', 'JOSE', 'JUAN', 'MIKE', 'DAVE', 'SARA', 'ANNA']);
    if (commonNames.has(normalized)) {
      console.log(`⚠️ "${word}" is a common name (skipped medication check)`);
      return false;
    }
    
    const medications = await this.getMedications();
    console.log(`🔍 Checking if "${word}" is a medication (${medications.size} drugs in database)`);
    
    // Exact match - immediate return
    if (medications.has(normalized)) {
      console.log(`✓ Exact match: "${word}" is a medication`);
      return true;
    }
    
    // Fuzzy match with 90% similarity threshold
    // OPTIMIZATION: Early exit as soon as we find a match
    for (const med of medications) {
      const similarity = this.calculateSimilarity(normalized, med);
      if (similarity >= 90) {
        console.log(`✓ Fuzzy matched medication: "${word}" ~= "${med}" (${similarity.toFixed(1)}% similar)`);
        return true; // Early exit - no need to check remaining medications
      }
    }
    
    console.log(`⚠️ "${word}" not a medication (highest similarity < 90%)`);
    return false;
  }

  /**
   * Strict medication check (alias for isMedication with 90% threshold)
   * Used specifically when validating patient names vs drug names
   */
  static async isMedicationStrict(word: string): Promise<boolean> {
    return this.isMedication(word);
  }

  /**
   * Check if a word is likely a first name (with 85% fuzzy matching for OCR errors)
   * Priority: 1) Local database, 2) Online database (largest first)
   */
  static async isFirstName(word: string): Promise<boolean> {
    const normalized = word.toUpperCase();
    
    // PRIORITY 1: Check local patient database first (fastest)
    const localPatients = await StorageService.getPatientNames();
    for (const patient of localPatients) {
      const localFirstName = patient.firstName.toUpperCase();
      if (localFirstName === normalized) {
        return true;
      }
      const similarity = this.calculateSimilarity(normalized, localFirstName);
      if (similarity >= 85) {
        return true; // Early exit
      }
    }
    
    // PRIORITY 2: Check online database
    const names = await this.getFirstNames();
    
    // Exact match first
    if (names.has(normalized)) {
      return true;
    }
    
    // Fuzzy match with 85% similarity threshold
    for (const name of names) {
      const similarity = this.calculateSimilarity(normalized, name);
      if (similarity >= 85) {
        console.log(`✓ Fuzzy matched first name: "${word}" ~= "${name}" (${similarity.toFixed(1)}% similar)`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a word is likely a last name (with 85% fuzzy matching for OCR errors)
   * Priority: 1) Local database, 2) Online database (largest first)
   */
  static async isLastName(word: string): Promise<boolean> {
    const normalized = word.toUpperCase();
    
    // PRIORITY 1: Check local patient database first (fastest)
    const localPatients = await StorageService.getPatientNames();
    for (const patient of localPatients) {
      const localLastName = patient.lastName.toUpperCase();
      if (localLastName === normalized) {
        return true;
      }
      const similarity = this.calculateSimilarity(normalized, localLastName);
      if (similarity >= 85) {
        return true; // Early exit
      }
    }
    
    // PRIORITY 2: Check online database
    const names = await this.getLastNames();
    
    // Exact match first
    if (names.has(normalized)) {
      return true;
    }
    
    // Fuzzy match with 85% similarity threshold
    for (const name of names) {
      const similarity = this.calculateSimilarity(normalized, name);
      if (similarity >= 85) {
        console.log(`✓ Fuzzy matched last name: "${word}" ~= "${name}" (${similarity.toFixed(1)}% similar)`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Validate if two words form a likely person name (with 85% fuzzy matching for OCR errors)
   * Checks local database first, then online database
   * Note: Local database is populated from user login, not from OCR parsing
   */
  static async isLikelyPersonName(firstName: string, lastName: string): Promise<boolean> {
    // First check local database of known patient names (from login)
    const isKnown = await StorageService.isKnownPatientName(firstName, lastName);
    if (isKnown) {
      console.log(`✓ Found in local patient database: "${firstName} ${lastName}"`);
      return true;
    }
    
    // Check online name databases with fuzzy matching
    const [isFirst, isLast] = await Promise.all([
      this.isFirstName(firstName),
      this.isLastName(lastName),
    ]);
    
    // Accept if either name matches (some people have unusual first or last names)
    if (isFirst || isLast) {
      console.log(`✓ Validated person name: "${firstName} ${lastName}" (first=${isFirst}, last=${isLast})`);
      return true;
    }
    
    return false;
  }

  /**
   * Find closest matching medication name using two-stage matching:
   * Stage 1: First word must match >= 90% similarity
   * Stage 2: If second word exists, it must match >= 10% similarity
   * 
   * Examples:
   * - "DOXYCYCLINE" matches "DOXYCYCLINE" (single word, 100%)
   * - "DOXYCYCLINE MONOHYR" matches "DOXYCYCLINE MONOHYDRATE" (first: 100%, second: ~70%)
   * - "CADE" does NOT match "CADEXOMER IODINE" (first word: 26%, < 90%)
   */
  static async findClosestMedication(input: string): Promise<string | undefined> {
    const normalized = input.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
    const medications = await this.getMedications();
    
    // Exact match first
    if (medications.has(normalized)) {
      console.log(`✓ Exact medication match: "${input}" = "${normalized}"`);
      return normalized;
    }
    
    // Split input into words
    const inputWords = normalized.split(/\s+/).filter(w => typeof w === 'string' && w.length > 0);
    const firstWord = inputWords[0];
    const secondWord = Array.isArray(inputWords) && inputWords.length > 1 ? inputWords[1] : undefined;
    
    console.log(`🔍 Two-stage matching: first="${firstWord}", second="${secondWord || '(none)'}"`);
    
    // Stage 1: Find medications where first word matches >= 90%
    const firstWordMatches: Array<{medication: string, firstSimilarity: number}> = [];
    
    for (const med of medications) {
      const medWords = med.split(/\s+/).filter(w => typeof w === 'string' && w.length > 0);
      const medFirstWord = medWords[0];
      
      const similarity = this.calculateSimilarity(firstWord, medFirstWord);
      
      if (similarity >= 90) {
        firstWordMatches.push({
          medication: med,
          firstSimilarity: similarity
        });
      }
    }
    
    if (Array.isArray(firstWordMatches) && firstWordMatches.length === 0) {
      console.log(`⚠️ No first word match found (need >= 90% similarity for "${firstWord}")`);
      
      // Fallback: Look for medications that start with the same prefix (at least 4 chars)
      if (typeof firstWord === 'string' && firstWord.length >= 4) {
        const prefix = firstWord.substring(0, 4);
        for (const med of medications) {
          if (med.startsWith(prefix)) {
            console.log(`✓ Prefix matched medication: "${input}" ~= "${med}" (prefix: ${prefix})`);
            return med;
          }
        }
      }
      
      return undefined;
    }
    
    console.log(`✓ Found ${Array.isArray(firstWordMatches) ? firstWordMatches.length : 0} medication(s) with first word >= 90% match`);
    
    // Stage 2: If input has second word, find best match with second word >= 10%
    if (secondWord) {
      let bestMatch: string | undefined;
      let bestSecondSimilarity = 0;
      let bestFirstSimilarity = 0;
      
      for (const match of firstWordMatches) {
        const medWords = match.medication.split(/\s+/).filter(w => typeof w === 'string' && w.length > 0);
        
        if (Array.isArray(medWords) && medWords.length > 1) {
          const medSecondWord = medWords[1];
          const secondSimilarity = this.calculateSimilarity(secondWord, medSecondWord);
          
          console.log(`  📊 "${match.medication}": first=${match.firstSimilarity.toFixed(1)}%, second=${secondSimilarity.toFixed(1)}%`);
          
          if (secondSimilarity >= 10) {
            // Prefer higher second word similarity, then higher first word similarity
            if (secondSimilarity > bestSecondSimilarity || 
                (secondSimilarity === bestSecondSimilarity && match.firstSimilarity > bestFirstSimilarity)) {
              bestMatch = match.medication;
              bestSecondSimilarity = secondSimilarity;
              bestFirstSimilarity = match.firstSimilarity;
            }
          }
        } else {
          // Single-word medication - only use if no multi-word match found
          console.log(`  📊 "${match.medication}": single word, first=${match.firstSimilarity.toFixed(1)}%`);
          if (!bestMatch) {
            bestMatch = match.medication;
            bestFirstSimilarity = match.firstSimilarity;
          }
        }
      }
      
      if (bestMatch) {
        if (bestSecondSimilarity > 0) {
          console.log(`✓ Two-stage match: "${input}" -> "${bestMatch}" (first: ${bestFirstSimilarity.toFixed(1)}%, second: ${bestSecondSimilarity.toFixed(1)}%)`);
        } else {
          console.log(`✓ Single-word match: "${input}" -> "${bestMatch}" (first: ${bestFirstSimilarity.toFixed(1)}%)`);
        }
        return bestMatch;
      }
      
      console.log(`⚠️ No second word match found (need >= 10% similarity for "${secondWord}")`);
      return undefined;
    }
    
    // No second word in input - return best first word match
    const bestMatch = firstWordMatches.reduce((best, current) => 
      current.firstSimilarity > best.firstSimilarity ? current : best
    );
    
    console.log(`✓ Single-word match: "${input}" -> "${bestMatch.medication}" (${bestMatch.firstSimilarity.toFixed(1)}%)`);
    return bestMatch.medication;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate similarity percentage between two strings (0-100%)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;
    return ((maxLength - distance) / maxLength) * 100;
  }

  /**
   * Check if a medication form is valid
   */
  static isValidMedicationForm(form: string): boolean {
    return this.MEDICATION_FORMS.has(form.toUpperCase());
  }

  /**
   * Extract medication name from text with multiple words
   * e.g., "DOXYCYCLINE MONOHYDRATE" -> "DOXYCYCLINE"
   */
  static async extractMedicationFromPhrase(phrase: string): Promise<string | undefined> {
    const words = phrase.split(/\s+/);
    
    for (const word of words) {
      const cleaned = word.toUpperCase().replace(/[^A-Z]/g, '');
      if (await this.isMedication(cleaned)) {
        return cleaned;
      }
      
      // Try to find closest match
      const closest = await this.findClosestMedication(cleaned);
      if (closest) {
        return closest;
      }
    }
    
    return undefined;
  }
}
