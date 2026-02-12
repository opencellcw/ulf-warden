/**
 * Decision Intelligence Storage
 * 
 * Armazena histórico de decisões em SQLite
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { DecisionAnalysis, DecisionHistory, DecisionStats, DecisionCategory } from './types';
import { log } from '../logger';

export class DecisionStorage {
  private db: Database.Database;
  
  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(process.cwd(), 'data', 'decisions.db');
    this.db = new Database(finalPath);
    this.init();
  }
  
  /**
   * Inicializar tabelas
   */
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        decision_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        question TEXT NOT NULL,
        alternatives TEXT, -- JSON array
        recommendation TEXT NOT NULL,
        confidence INTEGER NOT NULL,
        agreement INTEGER NOT NULL,
        category TEXT,
        timestamp INTEGER NOT NULL,
        analysis_time_ms INTEGER,
        implemented INTEGER DEFAULT 0, -- boolean
        outcome TEXT, -- success/failure/mixed/pending
        notes TEXT,
        full_analysis TEXT -- JSON do DecisionAnalysis completo
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_id ON decisions(user_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON decisions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_category ON decisions(category);
      CREATE INDEX IF NOT EXISTS idx_outcome ON decisions(outcome);
    `);
    
    log.info('[DecisionStorage] Database initialized');
  }
  
  /**
   * Salvar análise de decisão
   */
  save(analysis: DecisionAnalysis, userId: string, category?: DecisionCategory): string {
    const stmt = this.db.prepare(`
      INSERT INTO decisions (
        decision_id,
        user_id,
        question,
        alternatives,
        recommendation,
        confidence,
        agreement,
        category,
        timestamp,
        analysis_time_ms,
        full_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      analysis.requestId,
      userId,
      analysis.question,
      JSON.stringify(analysis.alternatives),
      analysis.consensus.recommendation,
      analysis.consensus.confidenceScore,
      analysis.consensus.agreementLevel,
      category || DecisionCategory.OTHER,
      analysis.timestamp.getTime(),
      analysis.analysisTimeMs,
      JSON.stringify(analysis)
    );
    
    log.info('[DecisionStorage] Decision saved', {
      decisionId: analysis.requestId,
      userId,
    });
    
    return analysis.requestId;
  }
  
  /**
   * Obter decisão por ID
   */
  getById(decisionId: string): DecisionHistory | null {
    const stmt = this.db.prepare('SELECT * FROM decisions WHERE decision_id = ?');
    const row = stmt.get(decisionId) as any;
    
    if (!row) return null;
    
    return this.rowToHistory(row);
  }
  
  /**
   * Obter decisões de um usuário
   */
  getByUser(userId: string, limit: number = 50): DecisionHistory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM decisions 
      WHERE user_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(userId, limit) as any[];
    return rows.map(row => this.rowToHistory(row));
  }
  
  /**
   * Obter decisões recentes (todas users)
   */
  getRecent(limit: number = 20): DecisionHistory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM decisions 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.rowToHistory(row));
  }
  
  /**
   * Marcar decisão como implementada
   */
  markImplemented(decisionId: string, outcome: 'success' | 'failure' | 'mixed', notes?: string): void {
    const stmt = this.db.prepare(`
      UPDATE decisions 
      SET implemented = 1, outcome = ?, notes = ?
      WHERE decision_id = ?
    `);
    
    stmt.run(outcome, notes || null, decisionId);
    
    log.info('[DecisionStorage] Decision marked as implemented', {
      decisionId,
      outcome,
    });
  }
  
  /**
   * Obter estatísticas de um usuário
   */
  getUserStats(userId: string): DecisionStats {
    // Total de decisões
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM decisions WHERE user_id = ?');
    const total = (totalStmt.get(userId) as any).count;
    
    // Por categoria
    const categoryStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM decisions 
      WHERE user_id = ? 
      GROUP BY category
    `);
    const categoryRows = categoryStmt.all(userId) as any[];
    const byCategory: Record<DecisionCategory, number> = {} as any;
    for (const row of categoryRows) {
      byCategory[row.category as DecisionCategory] = row.count;
    }
    
    // Por outcome
    const outcomeStmt = this.db.prepare(`
      SELECT outcome, COUNT(*) as count 
      FROM decisions 
      WHERE user_id = ? AND outcome IS NOT NULL
      GROUP BY outcome
    `);
    const outcomeRows = outcomeStmt.all(userId) as any[];
    const byOutcome = {
      success: 0,
      failure: 0,
      mixed: 0,
      pending: 0,
    };
    for (const row of outcomeRows) {
      if (row.outcome && row.outcome in byOutcome) {
        byOutcome[row.outcome as keyof typeof byOutcome] = row.count;
      }
    }
    
    // Média de confidence e agreement
    const avgStmt = this.db.prepare(`
      SELECT 
        AVG(confidence) as avg_confidence,
        AVG(agreement) as avg_agreement
      FROM decisions 
      WHERE user_id = ?
    `);
    const avgRow = avgStmt.get(userId) as any;
    
    // Categoria mais comum
    const mostCommonCat = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as DecisionCategory || DecisionCategory.OTHER;
    
    return {
      totalDecisions: total,
      byCategory,
      byOutcome,
      averageConfidence: Math.round(avgRow.avg_confidence || 0),
      averageAgreement: Math.round(avgRow.avg_agreement || 0),
      mostCommonCategory: mostCommonCat,
    };
  }
  
  /**
   * Converter row SQL para DecisionHistory
   */
  private rowToHistory(row: any): DecisionHistory {
    return {
      decisionId: row.decision_id,
      userId: row.user_id,
      question: row.question,
      alternatives: JSON.parse(row.alternatives || '[]'),
      recommendation: row.recommendation,
      confidence: row.confidence,
      agreement: row.agreement,
      timestamp: new Date(row.timestamp),
      implemented: row.implemented === 1,
      outcome: row.outcome as any,
      notes: row.notes,
    };
  }
  
  /**
   * Obter análise completa (para visualização detalhada)
   */
  getFullAnalysis(decisionId: string): DecisionAnalysis | null {
    const stmt = this.db.prepare('SELECT full_analysis FROM decisions WHERE decision_id = ?');
    const row = stmt.get(decisionId) as any;
    
    if (!row || !row.full_analysis) return null;
    
    const parsed = JSON.parse(row.full_analysis);
    // Reconverter timestamp
    parsed.timestamp = new Date(parsed.timestamp);
    
    return parsed as DecisionAnalysis;
  }
  
  /**
   * Fechar database
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Instância singleton
 */
let storageInstance: DecisionStorage | null = null;

export function getDecisionStorage(): DecisionStorage {
  if (!storageInstance) {
    storageInstance = new DecisionStorage();
  }
  return storageInstance;
}
