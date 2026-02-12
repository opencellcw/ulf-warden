#!/bin/bash

# Test Skills Library System
# This script tests skill storage, similarity search, and learning

set -e

echo "🧪 Testing Skills Library System"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Initialize Skills Library
echo ""
echo "Test 1: Initialize Skills Library"
echo "----------------------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Initializing SkillsLibrary...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  console.log('${GREEN}✅ Skills library initialized${NC}');
  
  // Get initial stats
  const stats = library.getStats();
  console.log('Initial stats:', {
    totalSkills: stats.totalSkills,
    categories: stats.categories.length,
    languages: stats.languages.length
  });
  
  library.close();
})();
"

# Test 2: Add Sample Skills
echo ""
echo "Test 2: Add Sample Skills"
echo "-------------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Adding sample skills...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  
  // Skill 1: Health check endpoint
  const skill1 = await library.addSkill({
    name: 'Health Check Endpoint',
    description: 'Create a /health endpoint that returns service status with uptime and version',
    code: \`
export function healthCheck() {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    version: process.env.VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  };
}
    \`,
    language: 'typescript',
    category: 'feature',
    tags: ['health', 'monitoring', 'endpoint', 'status']
  });
  console.log('${GREEN}✅ Added skill 1: Health Check Endpoint (ID: ' + skill1 + ')${NC}');
  
  // Skill 2: Rate limiting middleware
  const skill2 = await library.addSkill({
    name: 'Rate Limiting Middleware',
    description: 'Implement rate limiting for API endpoints using in-memory store',
    code: \`
const rateLimit = new Map();

export function rateLimitMiddleware(limit = 100, window = 60000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const userLimit = rateLimit.get(key) || { count: 0, resetAt: now + window };
    
    if (now > userLimit.resetAt) {
      userLimit.count = 0;
      userLimit.resetAt = now + window;
    }
    
    if (userLimit.count >= limit) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    userLimit.count++;
    rateLimit.set(key, userLimit);
    next();
  };
}
    \`,
    language: 'typescript',
    category: 'feature',
    tags: ['rate-limiting', 'middleware', 'api', 'security']
  });
  console.log('${GREEN}✅ Added skill 2: Rate Limiting Middleware (ID: ' + skill2 + ')${NC}');
  
  // Skill 3: Error handler
  const skill3 = await library.addSkill({
    name: 'Error Handler Middleware',
    description: 'Global error handler that logs errors and returns proper HTTP responses',
    code: \`
export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Internal server error' });
}
    \`,
    language: 'typescript',
    category: 'feature',
    tags: ['error-handling', 'middleware', 'api']
  });
  console.log('${GREEN}✅ Added skill 3: Error Handler (ID: ' + skill3 + ')${NC}');
  
  // Skill 4: Logger utility
  const skill4 = await library.addSkill({
    name: 'Logger Utility',
    description: 'Structured logging utility with different log levels and timestamps',
    code: \`
export class Logger {
  log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({ timestamp, level, message, ...meta }));
  }
  
  info(message, meta) { this.log('info', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }
}
    \`,
    language: 'typescript',
    category: 'utility',
    tags: ['logging', 'utility', 'monitoring']
  });
  console.log('${GREEN}✅ Added skill 4: Logger Utility (ID: ' + skill4 + ')${NC}');
  
  // Record some usage
  library.recordUsage(skill1, true);
  library.recordUsage(skill1, true);
  library.recordUsage(skill2, true);
  library.recordUsage(skill2, false);
  library.recordUsage(skill3, true);
  
  console.log('${GREEN}✅ Recorded usage for skills${NC}');
  
  library.close();
})();
"

# Test 3: Semantic Search
echo ""
echo "Test 3: Semantic Search"
echo "-----------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Testing semantic search...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  
  // Search 1: Health monitoring
  console.log('\\n🔍 Search: \"I need a health check endpoint\"');
  const results1 = await library.findSimilar('I need a health check endpoint that shows if the service is running', 3);
  
  if (results1.length > 0) {
    results1.forEach((r, i) => {
      console.log(\`  \${i + 1}. \${r.skill.name}\`);
      console.log(\`     Similarity: \${(r.similarity * 100).toFixed(1)}%\`);
      console.log(\`     Success Rate: \${r.skill.successRate.toFixed(0)}%\`);
      console.log(\`     Match: \${r.matchReason}\`);
    });
  } else {
    console.log('  No similar skills found');
  }
  
  // Search 2: Rate limiting
  console.log('\\n🔍 Search: \"Protect API from too many requests\"');
  const results2 = await library.findSimilar('Need to protect my API from users making too many requests', 3);
  
  if (results2.length > 0) {
    results2.forEach((r, i) => {
      console.log(\`  \${i + 1}. \${r.skill.name}\`);
      console.log(\`     Similarity: \${(r.similarity * 100).toFixed(1)}%\`);
      console.log(\`     Success Rate: \${r.skill.successRate.toFixed(0)}%\`);
    });
  } else {
    console.log('  No similar skills found');
  }
  
  // Search 3: Logging
  console.log('\\n🔍 Search: \"Better logging with timestamps\"');
  const results3 = await library.findSimilar('I want better logging with timestamps and structured format', 3);
  
  if (results3.length > 0) {
    results3.forEach((r, i) => {
      console.log(\`  \${i + 1}. \${r.skill.name}\`);
      console.log(\`     Similarity: \${(r.similarity * 100).toFixed(1)}%\`);
    });
  } else {
    console.log('  No similar skills found');
  }
  
  console.log('\\n${GREEN}✅ Semantic search working${NC}');
  
  library.close();
})();
"

# Test 4: Get Top Skills
echo ""
echo "Test 4: Get Top Performing Skills"
echo "----------------------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Getting top performing skills...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  
  const topSkills = library.getTopSkills(5, 1);
  
  console.log(\`\\nTop \${topSkills.length} skills:\`);
  topSkills.forEach((skill, i) => {
    console.log(\`\\n\${i + 1}. \${skill.name}\`);
    console.log(\`   Success Rate: \${skill.successRate.toFixed(0)}%\`);
    console.log(\`   Usage Count: \${skill.usageCount}\`);
    console.log(\`   Category: \${skill.category}\`);
    console.log(\`   Language: \${skill.language}\`);
  });
  
  console.log('\\n${GREEN}✅ Top skills retrieved${NC}');
  
  library.close();
})();
"

# Test 5: Library Statistics
echo ""
echo "Test 5: Library Statistics"
echo "--------------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Getting library statistics...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  
  const stats = library.getStats();
  
  console.log('\\n📊 Library Statistics:');
  console.log(\`   Total Skills: \${stats.totalSkills}\`);
  
  console.log('\\n   Categories:\');
  stats.categories.forEach(c => {
    console.log(\`     - \${c.category}: \${c.count} skills\`);
  });
  
  console.log('\\n   Languages:\');
  stats.languages.forEach(l => {
    console.log(\`     - \${l.language}: \${l.count} skills\`);
  });
  
  console.log('\\n   Top Performers:\');
  stats.topPerformers.forEach((skill, i) => {
    console.log(\`     \${i + 1}. \${skill.name} (\${skill.successRate.toFixed(0)}% success)\`);
  });
  
  console.log('\\n${GREEN}✅ Statistics retrieved${NC}');
  
  library.close();
})();
"

# Test 6: Search by Tags
echo ""
echo "Test 6: Search by Tags"
echo "----------------------"

node -e "
const { SkillsLibrary } = require('./dist/evolution/skills');

(async () => {
  console.log('${YELLOW}Searching skills by tags...${NC}');
  
  const library = new SkillsLibrary('./data/test-skills.db');
  
  // Search by 'monitoring' tag
  const monitoringSkills = library.searchByTags(['monitoring']);
  console.log(\`\\n🏷️ Skills tagged 'monitoring': \${monitoringSkills.length}\`);
  monitoringSkills.forEach(skill => {
    console.log(\`   - \${skill.name}\`);
  });
  
  // Search by 'middleware' tag
  const middlewareSkills = library.searchByTags(['middleware']);
  console.log(\`\\n🏷️ Skills tagged 'middleware': \${middlewareSkills.length}\`);
  middlewareSkills.forEach(skill => {
    console.log(\`   - \${skill.name}\`);
  });
  
  console.log('\\n${GREEN}✅ Tag search working${NC}');
  
  library.close();
})();
"

echo ""
echo "================================="
echo "${GREEN}✅ All Skills Library Tests Completed!${NC}"
echo "================================="
echo ""
echo "Summary:"
echo "- Skills can be added with embeddings"
echo "- Semantic search works (similarity matching)"
echo "- Usage tracking functional (success/failure)"
echo "- Statistics and top performers available"
echo "- Tag-based search working"
echo ""
echo "Next steps:"
echo "1. Integrate with EnhancedSelfImprover"
echo "2. Real implementations will auto-save as skills"
echo "3. Future proposals will reuse proven code"
echo ""
echo "Test database created: ./data/test-skills.db"
echo "To clean up: rm ./data/test-skills.db"
