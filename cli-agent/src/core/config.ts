import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

export class Config {
  private conf: Conf;
  private baseDir: string;
  
  constructor() {
    this.baseDir = join(homedir(), '.opencell');
    
    this.conf = new Conf({
      projectName: 'opencell-agent',
      cwd: this.baseDir,
      defaults: {
        provider: 'ollama',
        model: 'llama3',
        tools: {
          web_search: true,
          file_write: true,
          code_exec: false
        },
        ui: {
          colors: true,
          emojis: true
        }
      }
    });
  }
  
  async init() {
    // Create base directory
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
    
    // Create subdirectories
    const dirs = ['cache', 'models', 'logs'];
    dirs.forEach(dir => {
      const path = join(this.baseDir, dir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }
  
  get(key: string, defaultValue?: any): any {
    return this.conf.get(key, defaultValue);
  }
  
  set(key: string, value: any): void {
    this.conf.set(key, value);
  }
  
  has(key: string): boolean {
    return this.conf.has(key);
  }
  
  delete(key: string): void {
    this.conf.delete(key);
  }
  
  clear(): void {
    this.conf.clear();
  }
  
  getAll(): Record<string, any> {
    return this.conf.store;
  }
  
  getPath(subpath?: string): string {
    return subpath ? join(this.baseDir, subpath) : this.baseDir;
  }
}
