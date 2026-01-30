import Anthropic from '@anthropic-ai/sdk';
import { GITHUB_TOOLS } from './github';
import { WEB_TOOLS } from './web';
import { FILE_TOOLS } from './files';
import { PROCESS_TOOLS } from './process';
import { REPLICATE_TOOLS } from './replicate';
import { ELEVENLABS_TOOLS } from './elevenlabs';
import { OPENAI_TOOLS } from './openai-tools';

const BASE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'execute_shell',
    description: `Execute a shell command in the system. Use this to run commands like installing packages, starting servers, checking system status, etc.

Examples:
- Install packages: "pip install fastapi uvicorn"
- Start server: "uvicorn main:app --host 0.0.0.0 --port 8000 &"
- Check processes: "ps aux | grep python"
- System info: "df -h", "free -h", "uptime"

IMPORTANT:
- Commands timeout after 30 seconds
- Output is truncated if too long
- Secrets are automatically masked
- Use & at end to run in background`,
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'write_file',
    description: `Create or update a file with the given content. Use this to create code files, config files, etc.

Examples:
- Create Python file: path="api/main.py", content="from fastapi import FastAPI..."
- Create config: path="config.json", content='{"port": 8000}'
- Create HTML: path="index.html", content="<!DOCTYPE html>..."

The directory will be created automatically if it doesn't exist.`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path (relative or absolute)'
        },
        content: {
          type: 'string',
          description: 'The file content'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'read_file',
    description: `Read the contents of a file. Use this to check existing code, config files, logs, etc.

Examples:
- Read code: path="main.py"
- Read config: path="package.json"
- Read logs: path="/var/log/app.log"

Output is truncated if the file is very large.`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'list_directory',
    description: `List files and directories in a given path. Use this to explore the filesystem, see what files exist, etc.

Examples:
- Current directory: path="."
- Specific directory: path="/app/projects"
- Parent directory: path=".."`,
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list (default: current directory)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_processes',
    description: `Get information about running processes. Use this to check what's running, find PIDs, check resource usage, etc.

Shows top 20 processes sorted by memory usage.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Combine all tools
export const TOOLS: Anthropic.Tool[] = [
  ...BASE_TOOLS,
  ...GITHUB_TOOLS,
  ...WEB_TOOLS,
  ...FILE_TOOLS,
  ...PROCESS_TOOLS,
  ...REPLICATE_TOOLS,
  ...ELEVENLABS_TOOLS,
  ...OPENAI_TOOLS
];
