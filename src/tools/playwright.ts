import Anthropic from '@anthropic-ai/sdk';
import { chromium, Browser, Page } from 'playwright';
import { log } from '../logger';
import path from 'path';
import fs from 'fs';

/**
 * Playwright Browser Automation
 *
 * Provides headless browser capabilities for:
 * - Web scraping
 * - Automated testing
 * - Form submission
 * - Screenshot capture
 * - JavaScript execution
 * - Complex web interactions
 */

interface BrowserSession {
  browser: Browser;
  page: Page;
  createdAt: number;
}

// Browser session cache (reuse for 5 minutes)
const sessions = new Map<string, BrowserSession>();
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

export const PLAYWRIGHT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'browser_navigate',
    description: `Navigate to a URL and load the page in a headless browser.

Perfect for:
- Loading dynamic web pages (JavaScript-heavy sites)
- Accessing pages that require browser context
- Starting a browser automation session
- Testing page loading

Returns page title and status.

Example:
{ "url": "https://example.com" }`,
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to navigate to'
        },
        wait_until: {
          type: 'string',
          description: 'Wait until specific event (default: load)',
          enum: ['load', 'domcontentloaded', 'networkidle']
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_screenshot',
    description: `Capture a screenshot of the current page or specific element.

Perfect for:
- Visual verification
- Debugging web pages
- Capturing proof/evidence
- Testing responsive design

Returns path to saved screenshot.

Example:
{ "selector": "body", "full_page": true }`,
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of element to screenshot (optional, defaults to full page)'
        },
        full_page: {
          type: 'boolean',
          description: 'Capture full scrollable page (default: false)',
          default: false
        },
        filename: {
          type: 'string',
          description: 'Output filename (auto-generated if not provided)'
        }
      }
    }
  },
  {
    name: 'browser_get_content',
    description: `Extract text content or HTML from the page.

Perfect for:
- Web scraping
- Content extraction
- Data mining
- Text analysis

Returns extracted content as text or HTML.

Example:
{ "selector": ".article-body", "type": "text" }`,
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to extract from (optional, defaults to body)'
        },
        type: {
          type: 'string',
          description: 'Content type to extract',
          enum: ['text', 'html', 'inner_text'],
          default: 'text'
        },
        multiple: {
          type: 'boolean',
          description: 'Get all matching elements (default: false)',
          default: false
        }
      }
    }
  },
  {
    name: 'browser_click',
    description: `Click on an element in the page.

Perfect for:
- Following links
- Submitting forms
- Triggering JavaScript interactions
- Navigating dynamic content

Example:
{ "selector": "button.submit", "wait_for_navigation": true }`,
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of element to click'
        },
        wait_for_navigation: {
          type: 'boolean',
          description: 'Wait for navigation after click (default: false)',
          default: false
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_fill_form',
    description: `Fill out form fields on the page.

Perfect for:
- Automated form submission
- Testing forms
- Data entry automation
- Login flows

Example:
{
  "fields": [
    { "selector": "input[name='email']", "value": "test@example.com" },
    { "selector": "input[name='password']", "value": "password123" }
  ]
}`,
    input_schema: {
      type: 'object',
      properties: {
        fields: {
          type: 'array',
          description: 'Array of field selectors and values',
          items: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector of the form field'
              },
              value: {
                type: 'string',
                description: 'Value to fill in'
              }
            },
            required: ['selector', 'value']
          }
        }
      },
      required: ['fields']
    }
  },
  {
    name: 'browser_execute_js',
    description: `Execute JavaScript code in the browser context.

Perfect for:
- Complex DOM manipulation
- Extracting computed values
- Triggering custom events
- Advanced scraping

Returns the result of the JavaScript execution.

Example:
{ "code": "return document.title" }`,
    input_schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute (can use "return" to return value)'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'browser_wait_for',
    description: `Wait for specific conditions before proceeding.

Perfect for:
- Waiting for dynamic content
- Waiting for AJAX requests
- Ensuring elements are visible
- Synchronizing with page state

Example:
{ "selector": ".data-loaded", "state": "visible", "timeout": 10000 }`,
    input_schema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to wait for (if using selector wait)'
        },
        state: {
          type: 'string',
          description: 'Element state to wait for',
          enum: ['attached', 'detached', 'visible', 'hidden']
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_close',
    description: `Close the browser session and clean up resources.

Call this when done with browser automation to free up memory.

Example:
{ "session_id": "optional-if-tracking-multiple-sessions" }`,
    input_schema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID (optional, closes default session if not provided)'
        }
      }
    }
  }
];

export async function executePlaywrightTool(
  toolName: string,
  toolInput: any
): Promise<string> {
  switch (toolName) {
    case 'browser_navigate':
      return await browserNavigate(toolInput);
    case 'browser_screenshot':
      return await browserScreenshot(toolInput);
    case 'browser_get_content':
      return await browserGetContent(toolInput);
    case 'browser_click':
      return await browserClick(toolInput);
    case 'browser_fill_form':
      return await browserFillForm(toolInput);
    case 'browser_execute_js':
      return await browserExecuteJS(toolInput);
    case 'browser_wait_for':
      return await browserWaitFor(toolInput);
    case 'browser_close':
      return await browserClose(toolInput);
    default:
      throw new Error(`Unknown Playwright tool: ${toolName}`);
  }
}

/**
 * Get or create browser session
 */
async function getSession(sessionId: string = 'default'): Promise<BrowserSession> {
  // Clean up expired sessions
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      await session.browser.close();
      sessions.delete(id);
      log.info('[Playwright] Expired session closed', { sessionId: id });
    }
  }

  // Get or create session
  let session = sessions.get(sessionId);
  if (!session) {
    log.info('[Playwright] Launching new browser session', { sessionId });

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    session = {
      browser,
      page,
      createdAt: now
    };

    sessions.set(sessionId, session);
  }

  return session;
}

async function browserNavigate(input: any): Promise<string> {
  const { url, wait_until = 'load', timeout = 30000 } = input;

  try {
    log.info('[Playwright] Navigating to URL', { url, wait_until });

    const session = await getSession();
    const response = await session.page.goto(url, {
      waitUntil: wait_until as any,
      timeout
    });

    const title = await session.page.title();
    const status = response?.status() || 'unknown';

    log.info('[Playwright] Navigation successful', { url, title, status });

    return `✅ **Navigated to:** ${url}\n\n📄 **Page Title:** ${title}\n📊 **Status:** ${status}\n\n🌐 Browser session is active and ready for further actions.`;
  } catch (error: any) {
    log.error('[Playwright] Navigation failed', { url, error: error.message });
    throw new Error(`Failed to navigate: ${error.message}`);
  }
}

async function browserScreenshot(input: any): Promise<string> {
  const { selector, full_page = false, filename } = input;

  try {
    const session = await getSession();

    // Generate filename if not provided
    const screenshotDir = path.join(process.env.DATA_DIR || '/data', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const finalFilename = filename || `screenshot-${Date.now()}.png`;
    const filepath = path.join(screenshotDir, finalFilename);

    log.info('[Playwright] Taking screenshot', { selector, full_page, filepath });

    if (selector) {
      const element = await session.page.locator(selector);
      await element.screenshot({ path: filepath });
    } else {
      await session.page.screenshot({ path: filepath, fullPage: full_page });
    }

    log.info('[Playwright] Screenshot saved', { filepath });

    return `📸 **Screenshot captured!**\n\n💾 **Saved to:** ${filepath}\n🎯 **Target:** ${selector || 'Full page'}\n📏 **Full page:** ${full_page ? 'Yes' : 'No'}`;
  } catch (error: any) {
    log.error('[Playwright] Screenshot failed', { error: error.message });
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
}

async function browserGetContent(input: any): Promise<string> {
  const { selector, type = 'text', multiple = false } = input;

  try {
    const session = await getSession();

    log.info('[Playwright] Extracting content', { selector, type, multiple });

    let content: string | string[];

    if (multiple) {
      const elements = await session.page.locator(selector || 'body').all();
      content = await Promise.all(
        elements.map(async (el) => {
          if (type === 'html') return await el.innerHTML();
          if (type === 'inner_text') return await el.innerText();
          return await el.textContent() || '';
        })
      );
    } else {
      const element = session.page.locator(selector || 'body');
      if (type === 'html') {
        content = await element.innerHTML();
      } else if (type === 'inner_text') {
        content = await element.innerText();
      } else {
        content = await element.textContent() || '';
      }
    }

    const resultLength = Array.isArray(content)
      ? content.reduce((sum, c) => sum + c.length, 0)
      : content.length;

    log.info('[Playwright] Content extracted', {
      selector,
      type,
      multiple,
      length: resultLength
    });

    if (Array.isArray(content)) {
      return `📄 **Extracted ${content.length} elements:**\n\n${content.map((c, i) => `**${i + 1}.** ${c.substring(0, 500)}${c.length > 500 ? '...' : ''}`).join('\n\n')}`;
    }

    return `📄 **Content extracted:**\n\n${content.substring(0, 2000)}${content.length > 2000 ? '\n\n...(truncated)' : ''}`;
  } catch (error: any) {
    log.error('[Playwright] Content extraction failed', { error: error.message });
    throw new Error(`Failed to extract content: ${error.message}`);
  }
}

async function browserClick(input: any): Promise<string> {
  const { selector, wait_for_navigation = false, timeout = 30000 } = input;

  try {
    const session = await getSession();

    log.info('[Playwright] Clicking element', { selector, wait_for_navigation });

    if (wait_for_navigation) {
      await Promise.all([
        session.page.waitForNavigation({ timeout }),
        session.page.click(selector, { timeout })
      ]);
    } else {
      await session.page.click(selector, { timeout });
    }

    log.info('[Playwright] Click successful', { selector });

    return `✅ **Clicked:** ${selector}\n${wait_for_navigation ? '\n🔄 Waited for navigation to complete' : ''}`;
  } catch (error: any) {
    log.error('[Playwright] Click failed', { selector, error: error.message });
    throw new Error(`Failed to click element: ${error.message}`);
  }
}

async function browserFillForm(input: any): Promise<string> {
  const { fields } = input;

  try {
    const session = await getSession();

    log.info('[Playwright] Filling form', { fieldCount: fields.length });

    for (const field of fields) {
      await session.page.fill(field.selector, field.value);
      log.info('[Playwright] Field filled', { selector: field.selector });
    }

    log.info('[Playwright] Form filled successfully');

    return `✅ **Form filled successfully!**\n\n📝 **Fields filled:** ${fields.length}\n\n${fields.map((f: any) => `• ${f.selector}`).join('\n')}`;
  } catch (error: any) {
    log.error('[Playwright] Form filling failed', { error: error.message });
    throw new Error(`Failed to fill form: ${error.message}`);
  }
}

async function browserExecuteJS(input: any): Promise<string> {
  const { code } = input;

  try {
    const session = await getSession();

    log.info('[Playwright] Executing JavaScript', { codeLength: code.length });

    const result = await session.page.evaluate(code);

    log.info('[Playwright] JavaScript executed successfully');

    return `✅ **JavaScript executed!**\n\n📊 **Result:**\n\`\`\`\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  } catch (error: any) {
    log.error('[Playwright] JavaScript execution failed', { error: error.message });
    throw new Error(`Failed to execute JavaScript: ${error.message}`);
  }
}

async function browserWaitFor(input: any): Promise<string> {
  const { selector, state = 'visible', timeout = 30000 } = input;

  try {
    const session = await getSession();

    log.info('[Playwright] Waiting for element', { selector, state, timeout });

    await session.page.waitForSelector(selector, {
      state: state as any,
      timeout
    });

    log.info('[Playwright] Wait completed', { selector, state });

    return `✅ **Wait completed!**\n\n🎯 **Selector:** ${selector}\n📊 **State:** ${state}`;
  } catch (error: any) {
    log.error('[Playwright] Wait failed', { selector, error: error.message });
    throw new Error(`Wait failed: ${error.message}`);
  }
}

async function browserClose(input: any): Promise<string> {
  const { session_id = 'default' } = input;

  try {
    const session = sessions.get(session_id);

    if (!session) {
      return `⚠️ No active browser session found (ID: ${session_id})`;
    }

    log.info('[Playwright] Closing browser session', { sessionId: session_id });

    await session.browser.close();
    sessions.delete(session_id);

    log.info('[Playwright] Browser session closed', { sessionId: session_id });

    return `✅ **Browser session closed!**\n\n🧹 Resources freed up`;
  } catch (error: any) {
    log.error('[Playwright] Close failed', { error: error.message });
    throw new Error(`Failed to close browser: ${error.message}`);
  }
}
