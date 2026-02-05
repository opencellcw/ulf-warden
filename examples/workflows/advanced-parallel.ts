/**
 * Advanced Parallel Execution Example
 *
 * Demonstrates complex parallel execution patterns
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const advancedParallelWorkflow: WorkflowDefinition = {
  name: 'Advanced Parallel Workflow',
  description: 'Complex parallel execution with multiple strategies',
  maxDuration: 180000, // 3 minutes

  // Configure parallel execution
  parallelConfig: {
    maxConcurrent: 10, // Up to 10 concurrent workers
    queueSize: 50, // Max 50 tasks in queue
    timeout: 30000, // 30 second default timeout
  },

  steps: [
    // Step 1: Initialize
    {
      id: 'initialize',
      toolName: 'setup',
      input: {
        workflow: 'advanced_parallel',
        timestamp: Date.now(),
      },
    },

    // Step 2: Fan-out pattern - Process multiple items in parallel
    {
      id: 'fan_out_processing',
      dependsOn: ['initialize'],
      parallelGroup: {
        id: 'process_items',
        waitStrategy: 'all',
        maxConcurrent: 5, // Process 5 items at a time
        continueOnError: false,
        steps: [
          'process_item_1',
          'process_item_2',
          'process_item_3',
          'process_item_4',
          'process_item_5',
          'process_item_6',
          'process_item_7',
          'process_item_8',
          'process_item_9',
          'process_item_10',
        ],
      },
    },

    // Individual processing steps
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `process_item_${i + 1}`,
      toolName: 'process_item',
      input: (ctx: any) => ({
        itemId: i + 1,
        data: ctx.results.get('initialize'),
      }),
    })),

    // Step 3: Aggregate results
    {
      id: 'aggregate_results',
      dependsOn: ['fan_out_processing'],
      toolName: 'aggregate',
      input: (ctx) => {
        const results = [];
        for (let i = 1; i <= 10; i++) {
          const result = ctx.results.get(`process_item_${i}`);
          if (result) results.push(result);
        }
        return { results };
      },
    },

    // Step 4: Parallel validation - First successful validator wins
    {
      id: 'parallel_validation_race',
      dependsOn: ['aggregate_results'],
      parallelGroup: {
        id: 'validate_results',
        waitStrategy: 'race', // First to complete
        maxConcurrent: 3,
        steps: [
          'validate_with_ai',
          'validate_with_rules',
          'validate_with_ml_model',
        ],
      },
    },

    // Validation steps
    {
      id: 'validate_with_ai',
      toolName: 'llm_validate',
      input: (ctx) => ({
        data: ctx.results.get('aggregate_results'),
        model: 'claude-sonnet-4',
      }),
    },

    {
      id: 'validate_with_rules',
      toolName: 'rule_validator',
      input: (ctx) => ({
        data: ctx.results.get('aggregate_results'),
        rules: 'strict',
      }),
    },

    {
      id: 'validate_with_ml_model',
      toolName: 'ml_predict',
      input: (ctx) => ({
        data: ctx.results.get('aggregate_results'),
        model: 'validator_v2',
      }),
    },

    // Step 5: Parallel enrichment - Continue even if some fail
    {
      id: 'parallel_enrichment_allSettled',
      dependsOn: ['parallel_validation_race'],
      parallelGroup: {
        id: 'enrich_validated_data',
        waitStrategy: 'allSettled',
        maxConcurrent: 6,
        continueOnError: true,
        timeout: 20000,
        steps: [
          'enrich_user_context',
          'enrich_location_data',
          'enrich_historical_patterns',
          'enrich_recommendations',
          'enrich_risk_scores',
          'enrich_metadata',
        ],
      },
    },

    // Enrichment steps
    {
      id: 'enrich_user_context',
      toolName: 'fetch_user_context',
      input: (ctx) => ({
        data: ctx.results.get('aggregate_results'),
      }),
    },

    {
      id: 'enrich_location_data',
      toolName: 'geocode_locations',
      input: (ctx) => ({
        addresses: ctx.results.get('aggregate_results')?.addresses || [],
      }),
    },

    {
      id: 'enrich_historical_patterns',
      toolName: 'fetch_patterns',
      input: {
        lookback: '30d',
        minOccurrences: 3,
      },
    },

    {
      id: 'enrich_recommendations',
      toolName: 'generate_recommendations',
      input: (ctx) => ({
        based_on: ctx.results.get('aggregate_results'),
      }),
    },

    {
      id: 'enrich_risk_scores',
      toolName: 'calculate_risk',
      input: (ctx) => ({
        data: ctx.results.get('aggregate_results'),
        model: 'risk_v3',
      }),
    },

    {
      id: 'enrich_metadata',
      toolName: 'extract_metadata',
      input: (ctx) => ({
        source: ctx.results.get('aggregate_results'),
      }),
    },

    // Step 6: Parallel data exports - Any successful export is good enough
    {
      id: 'parallel_export_any',
      dependsOn: ['parallel_enrichment_allSettled'],
      parallelGroup: {
        id: 'export_data',
        waitStrategy: 'any', // Any success is enough
        maxConcurrent: 4,
        steps: [
          'export_to_s3',
          'export_to_database',
          'export_to_elasticsearch',
          'export_to_datawarehouse',
        ],
      },
    },

    // Export steps
    {
      id: 'export_to_s3',
      toolName: 's3_upload',
      input: (ctx) => ({
        bucket: 'data-exports',
        key: `export_${Date.now()}.json`,
        data: ctx.results.get('parallel_enrichment_allSettled'),
      }),
    },

    {
      id: 'export_to_database',
      toolName: 'database_insert',
      input: (ctx) => ({
        table: 'exports',
        data: ctx.results.get('parallel_enrichment_allSettled'),
      }),
    },

    {
      id: 'export_to_elasticsearch',
      toolName: 'es_index',
      input: (ctx) => ({
        index: 'exports',
        document: ctx.results.get('parallel_enrichment_allSettled'),
      }),
    },

    {
      id: 'export_to_datawarehouse',
      toolName: 'dw_load',
      input: (ctx) => ({
        dataset: 'exports',
        data: ctx.results.get('parallel_enrichment_allSettled'),
      }),
    },

    // Step 7: Nested parallel - Parallel groups within parallel groups
    {
      id: 'nested_parallel_processing',
      dependsOn: ['parallel_export_any'],
      parallelGroup: {
        id: 'multi_stage_processing',
        waitStrategy: 'all',
        maxConcurrent: 2,
        steps: ['stage_1_parallel', 'stage_2_parallel'],
      },
    },

    // Stage 1: More parallel processing
    {
      id: 'stage_1_parallel',
      parallelGroup: {
        id: 'stage_1',
        waitStrategy: 'all',
        maxConcurrent: 3,
        steps: ['stage_1_task_a', 'stage_1_task_b', 'stage_1_task_c'],
      },
    },

    {
      id: 'stage_1_task_a',
      toolName: 'process',
      input: { stage: 1, task: 'a' },
    },

    {
      id: 'stage_1_task_b',
      toolName: 'process',
      input: { stage: 1, task: 'b' },
    },

    {
      id: 'stage_1_task_c',
      toolName: 'process',
      input: { stage: 1, task: 'c' },
    },

    // Stage 2: More parallel processing
    {
      id: 'stage_2_parallel',
      parallelGroup: {
        id: 'stage_2',
        waitStrategy: 'all',
        maxConcurrent: 3,
        steps: ['stage_2_task_a', 'stage_2_task_b', 'stage_2_task_c'],
      },
    },

    {
      id: 'stage_2_task_a',
      toolName: 'process',
      input: { stage: 2, task: 'a' },
    },

    {
      id: 'stage_2_task_b',
      toolName: 'process',
      input: { stage: 2, task: 'b' },
    },

    {
      id: 'stage_2_task_c',
      toolName: 'process',
      input: { stage: 2, task: 'c' },
    },

    // Step 8: Parallel notifications - Fire and forget
    {
      id: 'parallel_notifications_allSettled',
      dependsOn: ['nested_parallel_processing'],
      parallelGroup: {
        id: 'send_notifications',
        waitStrategy: 'allSettled',
        maxConcurrent: 10,
        continueOnError: true,
        timeout: 5000,
        steps: [
          'notify_email',
          'notify_slack',
          'notify_discord',
          'notify_webhook',
          'notify_sns',
          'notify_pubsub',
        ],
      },
    },

    // Notification steps
    {
      id: 'notify_email',
      toolName: 'send_email',
      input: {
        to: 'admin@example.com',
        subject: 'Workflow complete',
      },
    },

    {
      id: 'notify_slack',
      toolName: 'slack_message',
      input: {
        channel: '#workflows',
        message: 'Advanced parallel workflow complete',
      },
    },

    {
      id: 'notify_discord',
      toolName: 'discord_message',
      input: {
        channel: 'workflows',
        message: 'Advanced parallel workflow complete',
      },
    },

    {
      id: 'notify_webhook',
      toolName: 'http_request',
      input: {
        url: 'https://webhook.example.com/workflow-complete',
        method: 'POST',
      },
    },

    {
      id: 'notify_sns',
      toolName: 'sns_publish',
      input: {
        topic: 'workflow-events',
        message: 'Workflow complete',
      },
    },

    {
      id: 'notify_pubsub',
      toolName: 'pubsub_publish',
      input: {
        topic: 'workflow-events',
        message: 'Workflow complete',
      },
    },

    // Step 9: Generate final summary
    {
      id: 'generate_summary',
      dependsOn: ['parallel_notifications_allSettled'],
      toolName: 'generate_summary',
      input: (ctx) => ({
        workflow: 'advanced_parallel',
        totalSteps: ctx.results.size,
        errors: ctx.errors.size,
        duration: Date.now() - ctx.startTime,
        parallelGroups: [
          'process_items',
          'validate_results',
          'enrich_validated_data',
          'export_data',
          'multi_stage_processing',
          'send_notifications',
        ],
      }),
    },
  ],
};
