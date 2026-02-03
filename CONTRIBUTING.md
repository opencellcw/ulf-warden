# Contributing to Ulfberht-Warden

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm, pnpm, or bun
- Docker (optional)
- Google Cloud SDK (for GKE testing)
- Basic understanding of TypeScript and async/await patterns

### Development Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/opencellcw
cd opencellcw

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your API keys

# Build
npm run build

# Run in development mode
npm run dev
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Your Changes

- Write clean, readable TypeScript code
- Follow existing code style and patterns
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Build
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Security audit
cd auditor && python src/main.py --path .. --once
```

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add amazing feature"
git commit -m "fix: resolve memory leak in session manager"
git commit -m "docs: update deployment guide"
git commit -m "refactor: simplify tool routing logic"
```

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Test additions or changes
- `chore` - Build process or auxiliary tool changes

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Reference to any related issues
- Screenshots/examples if applicable

## Code Style Guidelines

### TypeScript

```typescript
// Use explicit types
function processMessage(userId: string, content: string): Promise<void> {
  // Implementation
}

// Prefer async/await over promises
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return await response.json();
}

// Use interfaces for complex types
interface UserSession {
  userId: string;
  platform: 'slack' | 'discord' | 'telegram';
  history: Message[];
}

// Add JSDoc for public APIs
/**
 * Analyzes a conversation for learning opportunities
 * @param messages - Array of conversation messages
 * @returns Analysis results with extracted learnings
 */
export async function analyzeConversation(messages: Message[]): Promise<Analysis> {
  // Implementation
}
```

### File Organization

```
src/
├── handlers/        # Platform-specific handlers
├── tools/           # Tool implementations
├── learning/        # Self-improvement system
├── security/        # Security systems
├── agent.ts         # Core agent logic
├── chat.ts          # Claude API integration
└── types.ts         # Shared TypeScript types
```

### Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  log.error('[Component] Operation failed', {
    error: error.message,
    stack: error.stack,
    context: { userId, platform }
  });
  // Handle gracefully
}
```

## Testing Guidelines

### Unit Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('SessionManager', () => {
  it('should create isolated sessions per user', () => {
    const manager = new SessionManager();
    const session1 = manager.getSession('user1', 'slack');
    const session2 = manager.getSession('user2', 'slack');
    
    expect(session1).not.toBe(session2);
  });
});
```

### Integration Tests

Test complete workflows end-to-end:
- Message handling across platforms
- Tool execution pipelines
- Security system triggers

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions and classes
- Explain WHY, not just WHAT (code should be self-documenting for WHAT)
- Include examples for complex APIs

### README Updates

- Update feature lists when adding capabilities
- Add configuration examples for new options
- Update architecture diagrams if structure changes

### Changelog

Add entries to `CHANGELOG.md` for notable changes:
```markdown
## [Unreleased]

### Added
- New feature X for improved Y

### Fixed
- Bug in Z component causing unexpected behavior

### Changed
- Refactored ABC for better performance
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code builds without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
- [ ] Commits follow conventional commit format

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How were these changes tested?

## Checklist
- [ ] Code builds and runs
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Follows code style guidelines
```

## Areas for Contribution

### High Priority

- **Documentation improvements** - Always welcome!
- **Bug fixes** - Check issues labeled `bug`
- **Test coverage** - Help us reach 80%+ coverage
- **Performance optimizations** - Profile and optimize hot paths

### Feature Ideas

- **New tool implementations** - Add integrations (Linear, Jira, etc.)
- **Platform support** - WhatsApp, iMessage handlers
- **Dashboard UI** - React dashboard for monitoring
- **Analytics** - Usage metrics and insights
- **Mobile app** - Notifications and approvals

### Good First Issues

Look for issues labeled `good first issue` - these are beginner-friendly tasks that help you get familiar with the codebase.

## Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email security concerns to: lucas@cloudwalk

See [SECURITY.md](SECURITY.md) for our security policy.

## Questions?

- Open a discussion on GitHub
- Join our [Discord](https://discord.gg/WqJzPp22)
- Comment on relevant issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Ulfberht-Warden!** ⚔️
