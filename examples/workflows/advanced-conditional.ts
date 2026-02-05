/**
 * Advanced Conditional Workflow Example
 *
 * Demonstrates complex conditional branching in TypeScript
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const advancedConditionalWorkflow: WorkflowDefinition = {
  name: 'Advanced Conditional Workflow',
  description: 'Complex branching with nested conditions',
  maxDuration: 120000, // 2 minutes

  steps: [
    // Step 1: Analyze request
    {
      id: 'analyze_request',
      toolName: 'llm_analyze',
      input: (ctx) => ({
        prompt: `Analyze this request: ${ctx.userRequest}`,
        model: 'claude-sonnet-4',
      }),
    },

    // Step 2: Check if request needs approval
    {
      id: 'check_approval_needed',
      branch: {
        type: 'if',
        // Function condition: complex logic
        condition: (ctx) => {
          const analysis = ctx.results.get('analyze_request');
          const riskScore = analysis?.riskScore || 0;
          const userRole = 'admin'; // From context

          // Needs approval if risk > 7 and user is not admin
          return riskScore > 7 && userRole !== 'admin';
        },
        thenSteps: ['request_approval', 'wait_for_approval'],
        elseSteps: ['proceed_directly'],
      },
    },

    // Step 3a: Request approval (if needed)
    {
      id: 'request_approval',
      toolName: 'send_approval_request',
      input: {
        approvers: ['admin@company.com'],
        reason: 'High risk operation',
      },
    },

    // Step 3b: Wait for approval
    {
      id: 'wait_for_approval',
      dependsOn: ['request_approval'],
      toolName: 'wait_for_event',
      input: {
        eventType: 'approval_received',
        timeout: 3600000, // 1 hour
      },
    },

    // Step 3c: Proceed directly (no approval needed)
    {
      id: 'proceed_directly',
      toolName: 'log_info',
      input: {
        message: 'No approval needed, proceeding',
      },
    },

    // Step 4: Fetch data based on request type
    {
      id: 'fetch_data',
      dependsOn: ['check_approval_needed'],
      branch: {
        type: 'switch',
        // Extract request type from analysis
        expression: (ctx) => {
          const analysis = ctx.results.get('analyze_request');
          return analysis?.requestType || 'unknown';
        },
        cases: [
          {
            value: 'data_query',
            steps: ['fetch_from_database'],
          },
          {
            value: 'api_call',
            steps: ['call_external_api'],
          },
          {
            value: 'file_operation',
            steps: ['read_file'],
          },
          {
            value: 'calculation',
            steps: ['perform_calculation'],
          },
        ],
        defaultSteps: ['handle_unknown_request'],
      },
    },

    // Data fetching steps
    {
      id: 'fetch_from_database',
      toolName: 'database_query',
      input: (ctx) => ({
        query: ctx.results.get('analyze_request')?.query,
      }),
    },

    {
      id: 'call_external_api',
      toolName: 'http_request',
      input: (ctx) => ({
        url: ctx.results.get('analyze_request')?.apiUrl,
        method: 'GET',
      }),
    },

    {
      id: 'read_file',
      toolName: 'read_file',
      input: (ctx) => ({
        path: ctx.results.get('analyze_request')?.filePath,
      }),
    },

    {
      id: 'perform_calculation',
      toolName: 'calculator',
      input: (ctx) => ({
        expression: ctx.results.get('analyze_request')?.expression,
      }),
    },

    {
      id: 'handle_unknown_request',
      toolName: 'log_error',
      input: {
        message: 'Unknown request type',
      },
    },

    // Step 5: Validate results
    {
      id: 'validate_results',
      dependsOn: ['fetch_data'],
      branch: {
        type: 'if',
        condition: (ctx) => {
          // Check if any data fetching step succeeded
          const dataSteps = [
            'fetch_from_database',
            'call_external_api',
            'read_file',
            'perform_calculation',
          ];

          return dataSteps.some(stepId => ctx.results.has(stepId));
        },
        thenSteps: ['process_results'],
        elseSteps: ['handle_no_results'],
      },
    },

    // Step 6a: Process results (if valid)
    {
      id: 'process_results',
      toolName: 'data_processor',
      input: (ctx) => {
        // Find which data step executed
        const dataSteps = [
          'fetch_from_database',
          'call_external_api',
          'read_file',
          'perform_calculation',
        ];

        for (const stepId of dataSteps) {
          if (ctx.results.has(stepId)) {
            return {
              data: ctx.results.get(stepId),
              source: stepId,
            };
          }
        }

        return { data: null };
      },
    },

    // Step 6b: Handle no results
    {
      id: 'handle_no_results',
      toolName: 'log_error',
      input: {
        message: 'No data fetched',
      },
    },

    // Step 7: Format output based on data size
    {
      id: 'format_output',
      dependsOn: ['validate_results'],
      branch: {
        type: 'switch',
        expression: (ctx) => {
          const results = ctx.results.get('process_results');
          if (!results || !results.data) return 'empty';

          const dataSize = JSON.stringify(results.data).length;

          if (dataSize < 1000) return 'small';
          if (dataSize < 10000) return 'medium';
          return 'large';
        },
        cases: [
          {
            value: 'empty',
            steps: ['format_empty'],
          },
          {
            value: 'small',
            steps: ['format_inline'],
          },
          {
            value: 'medium',
            steps: ['format_summary'],
          },
          {
            value: 'large',
            steps: ['format_paginated'],
          },
        ],
      },
    },

    // Output formatting steps
    {
      id: 'format_empty',
      toolName: 'format_message',
      input: {
        template: 'No data available',
      },
    },

    {
      id: 'format_inline',
      toolName: 'format_message',
      input: (ctx) => ({
        template: 'inline',
        data: ctx.results.get('process_results'),
      }),
    },

    {
      id: 'format_summary',
      toolName: 'format_message',
      input: (ctx) => ({
        template: 'summary',
        data: ctx.results.get('process_results'),
        maxLength: 500,
      }),
    },

    {
      id: 'format_paginated',
      toolName: 'format_message',
      input: (ctx) => ({
        template: 'paginated',
        data: ctx.results.get('process_results'),
        pageSize: 10,
      }),
    },

    // Step 8: Send final response
    {
      id: 'send_response',
      dependsOn: ['format_output'],
      toolName: 'send_message',
      input: (ctx) => {
        // Find which formatting step executed
        const formatSteps = [
          'format_empty',
          'format_inline',
          'format_summary',
          'format_paginated',
        ];

        for (const stepId of formatSteps) {
          if (ctx.results.has(stepId)) {
            return {
              message: ctx.results.get(stepId),
              userId: ctx.userId,
            };
          }
        }

        return {
          message: 'Error formatting response',
          userId: ctx.userId,
        };
      },
    },
  ],
};
