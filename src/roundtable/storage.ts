import Database from 'better-sqlite3';
import { RoundTableSession, RoundTableResult } from './types';
import { log } from '../logger';

/**
 * RoundTable Storage - SQLite Persistence
 * 
 * Stores RoundTable sessions for:
 * - Analytics (which agents win most, which voting rules work best)
 * - History (users can review past decisions)
 * - Learning (improve prompts based on successful sessions)
 */

const DB_PATH = process.env.DATA_DIR ? `${process.env.DATA_DIR}/roundtable.db` : './data/roundtable.db';

/**
 * RoundTable Storage Manager
 */
export class RoundTableStorage {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath);
    this.initSchema();
    log.info('[RoundTableStorage] Initialized', { dbPath });
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roundtable_sessions (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        user_id TEXT NOT NULL,
        voting_rule TEXT NOT NULL,
        total_rounds INTEGER NOT NULL,
        winner_agent_id TEXT NOT NULL,
        winner_proposal_id TEXT NOT NULL,
        consensus_score REAL NOT NULL,
        created_at INTEGER NOT NULL,
        completed_at INTEGER,
        session_data TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON roundtable_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_topic ON roundtable_sessions(topic);
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON roundtable_sessions(created_at);

      CREATE TABLE IF NOT EXISTS roundtable_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        round INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES roundtable_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON roundtable_messages(session_id);

      CREATE TABLE IF NOT EXISTS roundtable_proposals (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        benefits TEXT NOT NULL,
        steps TEXT NOT NULL,
        is_winner INTEGER DEFAULT 0,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES roundtable_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_proposals_session ON roundtable_proposals(session_id);

      CREATE TABLE IF NOT EXISTS roundtable_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        proposal_id TEXT,
        rating INTEGER,
        ranking TEXT,
        justification TEXT,
        FOREIGN KEY (session_id) REFERENCES roundtable_sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_votes_session ON roundtable_votes(session_id);
    `);
  }

  /**
   * Save a RoundTable session
   */
  saveSession(result: RoundTableResult): void {
    const { session, winner, consensusScore } = result;

    try {
      // Start transaction
      const insert = this.db.transaction(() => {
        // Save session metadata
        this.db.prepare(`
          INSERT INTO roundtable_sessions (
            id, topic, user_id, voting_rule, total_rounds, 
            winner_agent_id, winner_proposal_id, consensus_score,
            created_at, completed_at, session_data
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          session.id,
          session.topic,
          session.userId,
          session.votingRule,
          result.totalRounds,
          winner.agentId,
          winner.id,
          consensusScore,
          session.createdAt,
          session.completedAt,
          JSON.stringify(session)
        );

        // Save messages
        const insertMessage = this.db.prepare(`
          INSERT INTO roundtable_messages (session_id, agent_id, content, round, timestamp)
          VALUES (?, ?, ?, ?, ?)
        `);

        session.messages.forEach(msg => {
          insertMessage.run(
            session.id,
            msg.agentId,
            msg.content,
            msg.round,
            msg.timestamp
          );
        });

        // Save proposals
        const insertProposal = this.db.prepare(`
          INSERT INTO roundtable_proposals (
            id, session_id, agent_id, title, description, benefits, steps, is_winner, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        session.proposals.forEach(prop => {
          insertProposal.run(
            prop.id,
            session.id,
            prop.agentId,
            prop.title,
            prop.description,
            JSON.stringify(prop.benefits),
            JSON.stringify(prop.steps),
            prop.id === winner.id ? 1 : 0,
            prop.timestamp
          );
        });

        // Save votes
        const insertVote = this.db.prepare(`
          INSERT INTO roundtable_votes (
            session_id, agent_id, proposal_id, rating, ranking, justification
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        session.votes.forEach(vote => {
          insertVote.run(
            session.id,
            vote.agentId,
            vote.proposalId || null,
            vote.rating || null,
            vote.ranking ? JSON.stringify(vote.ranking) : null,
            vote.justification
          );
        });
      });

      insert();

      log.info('[RoundTableStorage] Session saved', {
        sessionId: session.id,
        topic: session.topic
      });
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to save session', {
        sessionId: session.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): RoundTableSession | null {
    try {
      const row = this.db.prepare(`
        SELECT session_data FROM roundtable_sessions WHERE id = ?
      `).get(sessionId) as { session_data: string } | undefined;

      if (!row) {
        return null;
      }

      return JSON.parse(row.session_data);
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get session', {
        sessionId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get sessions by topic
   */
  getSessionsByTopic(topic: string, limit: number = 10): RoundTableSession[] {
    try {
      const rows = this.db.prepare(`
        SELECT session_data 
        FROM roundtable_sessions 
        WHERE topic LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(`%${topic}%`, limit) as { session_data: string }[];

      return rows.map(row => JSON.parse(row.session_data));
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get sessions by topic', {
        topic,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get sessions by user
   */
  getSessionsByUser(userId: string, limit: number = 10): RoundTableSession[] {
    try {
      const rows = this.db.prepare(`
        SELECT session_data 
        FROM roundtable_sessions 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit) as { session_data: string }[];

      return rows.map(row => JSON.parse(row.session_data));
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get sessions by user', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get agent win rates
   */
  getAgentWinRates(): Record<string, number> {
    try {
      const rows = this.db.prepare(`
        SELECT winner_agent_id, COUNT(*) as wins
        FROM roundtable_sessions
        GROUP BY winner_agent_id
      `).all() as { winner_agent_id: string; wins: number }[];

      const total = rows.reduce((sum, row) => sum + row.wins, 0);

      const winRates: Record<string, number> = {};
      rows.forEach(row => {
        winRates[row.winner_agent_id] = row.wins / total;
      });

      return winRates;
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get agent win rates', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Get voting rule effectiveness
   */
  getVotingRuleStats(): Record<string, { avgConsensus: number; count: number }> {
    try {
      const rows = this.db.prepare(`
        SELECT 
          voting_rule,
          AVG(consensus_score) as avg_consensus,
          COUNT(*) as count
        FROM roundtable_sessions
        GROUP BY voting_rule
      `).all() as { voting_rule: string; avg_consensus: number; count: number }[];

      const stats: Record<string, { avgConsensus: number; count: number }> = {};
      rows.forEach(row => {
        stats[row.voting_rule] = {
          avgConsensus: row.avg_consensus,
          count: row.count
        };
      });

      return stats;
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get voting rule stats', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit: number = 20): Array<{
    id: string;
    topic: string;
    userId: string;
    votingRule: string;
    consensusScore: number;
    createdAt: number;
  }> {
    try {
      const rows = this.db.prepare(`
        SELECT id, topic, user_id, voting_rule, consensus_score, created_at
        FROM roundtable_sessions
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit) as Array<{
        id: string;
        topic: string;
        user_id: string;
        voting_rule: string;
        consensus_score: number;
        created_at: number;
      }>;

      return rows.map(row => ({
        id: row.id,
        topic: row.topic,
        userId: row.user_id,
        votingRule: row.voting_rule,
        consensusScore: row.consensus_score,
        createdAt: row.created_at
      }));
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get recent sessions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    avgConsensusScore: number;
    avgRounds: number;
    mostUsedVotingRule: string;
  } {
    try {
      const stats = this.db.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          AVG(consensus_score) as avg_consensus,
          AVG(total_rounds) as avg_rounds,
          (SELECT voting_rule FROM roundtable_sessions 
           GROUP BY voting_rule 
           ORDER BY COUNT(*) DESC 
           LIMIT 1) as most_used_rule
        FROM roundtable_sessions
      `).get() as {
        total_sessions: number;
        avg_consensus: number;
        avg_rounds: number;
        most_used_rule: string;
      };

      return {
        totalSessions: stats.total_sessions,
        avgConsensusScore: stats.avg_consensus || 0,
        avgRounds: stats.avg_rounds || 0,
        mostUsedVotingRule: stats.most_used_rule || 'majority'
      };
    } catch (error: any) {
      log.error('[RoundTableStorage] Failed to get stats', {
        error: error.message
      });
      return {
        totalSessions: 0,
        avgConsensusScore: 0,
        avgRounds: 0,
        mostUsedVotingRule: 'majority'
      };
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    log.info('[RoundTableStorage] Database closed');
  }
}

/**
 * Singleton instance
 */
let storage: RoundTableStorage | null = null;

export function getRoundTableStorage(): RoundTableStorage {
  if (!storage) {
    storage = new RoundTableStorage();
  }
  return storage;
}
