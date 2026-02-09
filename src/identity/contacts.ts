import fs from 'fs';
import path from 'path';
import { log } from '../logger';

/**
 * Trust levels for user identification
 */
export type TrustLevel = 'owner' | 'trusted' | 'known' | 'unknown';

export interface Contact {
  id: string;
  name: string;
  trustLevel: TrustLevel;
  notes?: string;
}

/**
 * Contact Manager
 *
 * Loads and manages user contacts from workspace/memory/contacts.md
 * Used to verify user identity and trust level before sensitive actions.
 */
class ContactManager {
  private contacts: Map<string, Contact> = new Map();
  private contactsPath: string;

  constructor(workspacePath: string = './workspace') {
    this.contactsPath = path.join(workspacePath, 'memory', 'contacts.md');
    this.load();
  }

  /**
   * Load contacts from contacts.md
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.contactsPath)) {
        log.warn('[Contacts] contacts.md not found, creating default');
        this.createDefault();
        return;
      }

      const content = fs.readFileSync(this.contactsPath, 'utf-8');

      // Simple parsing: find lines that look like table rows with Discord/Slack IDs
      // Format: | 123456789 | Name | owner | Notes |
      const lines = content.split('\n');
      let count = 0;

      for (const line of lines) {
        // Match table rows (must have | at start and end, with 4 columns)
        const match = line.match(/^\|\s*(\S+)\s*\|\s*([^|]+?)\s*\|\s*(\w+)\s*\|\s*([^|]*?)\s*\|$/);

        if (match) {
          const [, id, name, trustLevel, notes] = match;

          // Skip headers and empty rows
          if (id === 'Discord ID' || id === 'Slack ID' || id === 'Phone/ID' || id === '(vazio)' || id.includes('-')) {
            continue;
          }

          // Validate trust level
          if (!['owner', 'trusted', 'known', 'unknown'].includes(trustLevel)) {
            continue;
          }

          this.contacts.set(id, {
            id,
            name: name.trim(),
            trustLevel: trustLevel as TrustLevel,
            notes: notes.trim() || undefined
          });

          count++;
        }
      }

      log.info('[Contacts] Loaded contacts', { count });
    } catch (error: any) {
      log.error('[Contacts] Failed to load', { error: error.message });
    }
  }

  /**
   * Create default contacts.md with owner
   */
  private createDefault(): void {
    const defaultContent = `# Contacts

Lista de pessoas que o Ulf conhece.

## Discord

| Discord ID | Nome | Trust Level | Notas |
|------------|------|-------------|-------|
| 375567912706416642 | Ulf/Lucas | owner | Criador do bot |
`;

    try {
      const dir = path.dirname(this.contactsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.contactsPath, defaultContent, 'utf-8');
      log.info('[Contacts] Created default contacts.md');
      this.load();
    } catch (error: any) {
      log.error('[Contacts] Failed to create default', { error: error.message });
    }
  }

  /**
   * Get contact by ID
   */
  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  /**
   * Get trust level for user
   * Returns 'unknown' if not found
   */
  getTrustLevel(id: string): TrustLevel {
    const contact = this.contacts.get(id);
    return contact?.trustLevel || 'unknown';
  }

  /**
   * Check if user is owner
   */
  isOwner(id: string): boolean {
    return this.getTrustLevel(id) === 'owner';
  }

  /**
   * Check if user is trusted (owner or trusted level)
   */
  isTrusted(id: string): boolean {
    const level = this.getTrustLevel(id);
    return level === 'owner' || level === 'trusted';
  }

  /**
   * Check if action is allowed for user
   *
   * Sensitive actions require at least 'trusted' level
   */
  canPerformSensitiveAction(id: string): boolean {
    return this.isTrusted(id);
  }

  /**
   * Get formatted identity info for system prompt
   */
  getIdentityContext(id: string): string {
    const contact = this.getContact(id);

    if (!contact) {
      return `User ID: ${id} (Trust: unknown - verify identity before sensitive actions)`;
    }

    return `User: ${contact.name} (ID: ${id}, Trust: ${contact.trustLevel})`;
  }

  /**
   * Reload contacts from disk
   */
  reload(): void {
    log.info('[Contacts] Reloading contacts');
    this.contacts.clear();
    this.load();
  }

  /**
   * Get all contacts
   */
  getAllContacts(): Contact[] {
    return Array.from(this.contacts.values());
  }
}

export const contactManager = new ContactManager();
