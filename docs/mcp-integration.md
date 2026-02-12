# Model Context Protocol (MCP) Integration

Complete integration guide for connecting OpenCell to the MCP ecosystem.

## 🎯 Overview

**Model Context Protocol (MCP)** is an open standard from Anthropic that enables seamless integration between LLM applications and external services. Instead of coding individual tools, OpenCell can now connect to **100+ ready-made MCP servers** for instant capabilities.

### What This Means

- **Before MCP**: Write custom code for every integration (GitHub, Postgres, Slack, etc.)
- **After MCP**: Add 3 lines to `mcp.json` and get instant access to dozens of tools

### Architecture

```
┌─────────────────┐         JSON-RPC 2.0        ┌──────────────────┐
│   OpenCell      │  ────────────────────────→  │  MCP Server      │
│ (MCP Client)    │   stdio / SSE / HTTP       │  (GitHub/Slack)  │
│                 │  ←────────────────────────  │                  │
│ - Tool Discovery│   tools/list               │ - Exposes tools  │
│ - Tool Execution│   tools/call               │ - Resources      │
│ - Auto-mapping  │   resources/read           │ - Prompts        │
└─────────────────┘                            └──────────────────┘
```

##  🚀 Quick Start

### 1. Install MCP Server

```bash
# Example: Brave Search
npx -y @modelcontextprotocol/server-brave-search

# Example: GitHub
npx -y @modelcontextprotocol/server-github
```

### 2. Configure in mcp.json

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "transport": "stdio",
      "enabled": true
    }
  }
}
```

### 3. Add API Key to .env

```bash
BRAVE_API_KEY=your-api-key-here
```

### 4. Restart OpenCell

```bash
npm run build
npm start
```

### 5. Use in Discord/Slack

```
@Ulf search for "Model Context Protocol" on the web
```

✨ OpenCell automatically uses `mcp_brave-search_brave_web_search` tool!

## 📦 Available MCP Servers

### Official Servers (by Anthropic)

| Server | Tools | Description |
|--------|-------|-------------|
| **brave-search** | Web search | Search the web via Brave API |
| **github** | 15+ tools | Create issues, PRs, search code |
| **google-maps** | Geocoding, directions | Location services |
| **postgres** | Query, schema | Database operations |
| **slack** | Send messages, channels | Slack integration |
| **filesystem** | Read, write, list | File operations |
| **puppeteer** | Browser automation | Screenshots, web scraping |
| **memory** | Store, recall | Persistent memory |
| **fetch** | HTTP requests | Web API calls |
| **sequential-thinking** | Reasoning | Extended thinking |

### Community Servers (1000+ available)

Browse at: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)

## 🔧 Configuration Guide

### Transport Types

#### stdio (Local Process)

Best for: Local development, command-line tools

```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-NAME"],
  "env": {
    "API_KEY": "${API_KEY}"
  },
  "transport": "stdio"
}
```

#### SSE (HTTP/Server-Sent Events)

Best for: Remote servers, microservices

```json
{
  "url": "http://localhost:3001/sse",
  "transport": "sse"
}
```

### Environment Variables

MCP config supports `${VAR}` substitution:

```json
{
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}",
    "DATABASE_URL": "${DATABASE_URL}"
  }
}
```

Add variables to `.env`:
```bash
GITHUB_TOKEN=ghp_xxxxx
DATABASE_URL=postgresql://localhost/db
```

### Enable/Disable Servers

```json
{
  "github": {
    "enabled": false  // ← Disabled without removing config
  }
}
```

## 📋 Complete Configuration Example

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "transport": "stdio",
      "enabled": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "transport": "stdio",
      "enabled": true
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "${DATABASE_URL}"
      ],
      "transport": "stdio",
      "enabled": false
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      },
      "transport": "stdio",
      "enabled": false
    }
  }
}
```

## 💬 Discord Commands

### Check MCP Status

```
!mcp status
```

Shows:
- Connected servers
- Tool count per server
- Health check status

### List All Servers

```
!mcp servers
```

Shows detailed info for each server:
- Transport type
- Tools count
- Resources count
- Connection status

### List Tools

```
# All tools from all servers
!mcp tools

# Tools from specific server
!mcp tools brave-search
```

### Help

```
!mcp help
```

## 🔌 How It Works

### 1. Initialization

When OpenCell starts:

```typescript
import { initializeMCP } from './mcp';

// On startup
await initializeMCP();
```

This:
- Loads `mcp.json` configuration
- Connects to all enabled servers via stdio/SSE
- Lists available tools from each server
- Maps tools to OpenCell's internal format

### 2. Tool Discovery

Each MCP server exposes tools via `listTools()`:

```json
{
  "tools": [
    {
      "name": "brave_web_search",
      "description": "Search the web using Brave Search API",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      }
    }
  ]
}
```

### 3. Automatic Mapping

OpenCell converts MCP tools to Anthropic format:

```typescript
// MCP Tool
{ name: "brave_web_search", ... }

// Becomes OpenCell Tool
{ 
  name: "mcp_brave-search_brave_web_search",
  description: "[brave-search] Search the web...",
  ...
}
```

### 4. Tool Execution

When LLM calls the tool:

```typescript
// LLM decides to use tool
{
  "name": "mcp_brave-search_brave_web_search",
  "input": { "query": "MCP protocol" }
}

// OpenCell routes to MCP server
const result = await mcpClient.executeTool(
  "brave-search",
  "brave_web_search",
  { query: "MCP protocol" }
);

// Result returned to LLM
// LLM incorporates result into response
```

### 5. Health Monitoring

Every 30 seconds:
- Ping each server
- If unhealthy, attempt reconnection
- Log issues

## 🧪 Testing

### Test Individual Server

```bash
# Test Brave Search
npx -y @modelcontextprotocol/server-brave-search
```

Should show: "Brave Search MCP Server running on stdio"

### Test in OpenCell

```
@Ulf search for "test query" using Brave

# Or more natural
@Ulf what's the latest news about AI?
```

Check logs:
```bash
# Should see MCP tool execution
[MCP] Executing tool { server: 'brave-search', tool: 'brave_web_search' }
```

## 🐛 Troubleshooting

### Server Won't Connect

**Check 1**: Verify command works manually
```bash
npx -y @modelcontextprotocol/server-brave-search
```

**Check 2**: Verify API keys in .env
```bash
grep BRAVE_API_KEY .env
```

**Check 3**: Check logs
```bash
kubectl logs -n ulf deployment/ulf-warden | grep MCP
```

### Tool Not Available

**Check 1**: Is server enabled?
```json
{ "enabled": true }
```

**Check 2**: Check tool list
```
!mcp tools brave-search
```

**Check 3**: Refresh capabilities
Restart OpenCell to re-scan tools.

### Slow Responses

**Issue**: MCP tool calls add latency

**Solutions**:
- Use local servers (stdio) instead of remote (SSE)
- Cache results where appropriate
- Use faster MCP servers

## 📊 Performance

### Cost

MCP adds NO extra cost:
- Tool calls use same LLM tokens as before
- MCP communication is free (JSON-RPC)
- Only API costs are from external services (Brave, GitHub, etc.)

### Latency

- stdio transport: ~100-500ms per tool call
- SSE transport: ~200-1000ms per tool call
- Depends on external service speed

## 🔒 Security

### API Key Safety

- ✅ Keys in `.env` (not committed to git)
- ✅ Environment variable substitution
- ✅ Process-level isolation (stdio)

### Tool Restrictions

MCP tools respect OpenCell's existing security:
- Rate limiting applies
- Admin-only commands enforced
- Audit logging enabled

### Best Practices

1. **Minimal permissions**: Only enable needed servers
2. **Read-only first**: Test with read-only operations
3. **Monitor usage**: Track MCP tool calls in logs
4. **Sandbox testing**: Test new servers in dev first

## 🚀 Advanced Usage

### Custom MCP Server

Create your own server:

```typescript
// my-custom-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {}
  }
});

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'my_tool',
    description: 'My custom tool',
    inputSchema: { ... }
  }]
}));

server.setRequestHandler('tools/call', async (request) => {
  // Handle tool execution
  return { content: [...] };
});
```

Add to `mcp.json`:
```json
{
  "my-server": {
    "command": "node",
    "args": ["my-custom-server.js"],
    "transport": "stdio"
  }
}
```

### Programmatic Access

```typescript
import { getMCPClientManager } from './mcp';

const client = getMCPClientManager();

// List all tools
const tools = await client.listAllTools();

// Execute tool directly
const result = await client.executeTool(
  'brave-search',
  'brave_web_search',
  { query: 'test' }
);

// Check server status
const status = client.getServerStatus('brave-search');
```

## 📚 References

- **MCP Specification**: [spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io)
- **TypeScript SDK**: [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **Server Repository**: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **Inspector Tool**: [github.com/modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)

## 🎉 Summary

MCP integration gives OpenCell:

- ✅ **100+ ready-made tools** from ecosystem
- ✅ **Zero custom coding** for integrations
- ✅ **Plug-and-play** architecture
- ✅ **Auto-discovery** of capabilities
- ✅ **Health monitoring** and reconnection
- ✅ **Discord commands** for management
- ✅ **Production-ready** with error handling

**Add a new integration in 3 lines of config!** 🚀

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-02-11
