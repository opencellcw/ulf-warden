/**
 * Data Processing Workflow
 *
 * ETL (Extract, Transform, Load) pipeline for data processing:
 * 1. Read source data → Extract from files
 * 2. Validate format → Check schema
 * 3. Transform data → Clean and normalize
 * 4. Validate output → Ensure quality
 * 5. Write results → Save processed data
 * 6. Generate report → Create summary
 *
 * Usage:
 *   import { dataProcessingWorkflow } from './examples/workflows/data-processing';
 *   await workflowManager.execute(dataProcessingWorkflow, { userId, userRequest });
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const dataProcessingWorkflow: WorkflowDefinition = {
  name: 'process_data',
  description: 'ETL pipeline for data extraction, transformation, and loading',
  maxDuration: 600000, // 10 minutes

  steps: [
    // Phase 1: Extract - Read source files (parallel)
    {
      id: 'read_source_1',
      toolName: 'read_file',
      input: {
        path: './data/input/source1.json'
      },
      onError: 'fail',
      parallel: true
    },

    {
      id: 'read_source_2',
      toolName: 'read_file',
      input: {
        path: './data/input/source2.json'
      },
      onError: 'continue', // Optional source
      parallel: true
    },

    {
      id: 'read_source_3',
      toolName: 'read_file',
      input: {
        path: './data/input/source3.json'
      },
      onError: 'continue', // Optional source
      parallel: true
    },

    // Phase 2: Validate input schemas
    {
      id: 'validate_source_1',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('read_source_1')}' | jq -e 'type == "array"'`,
        workingDir: '.'
      }),
      dependsOn: ['read_source_1'],
      onError: 'fail'
    },

    // Phase 3: Transform - Merge and clean data
    {
      id: 'merge_sources',
      toolName: 'execute_shell',
      input: (ctx) => {
        const source1 = ctx.results.get('read_source_1');
        const source2 = ctx.results.get('read_source_2') || '[]';
        const source3 = ctx.results.get('read_source_3') || '[]';

        return {
          command: `jq -s 'add' <(echo '${source1}') <(echo '${source2}') <(echo '${source3}')`,
          workingDir: '.'
        };
      },
      dependsOn: ['validate_source_1'],
      onError: 'fail'
    },

    // Phase 4: Data cleaning and normalization
    {
      id: 'clean_data',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('merge_sources')}' | jq 'map(select(.id != null)) | unique_by(.id)'`,
        workingDir: '.'
      }),
      dependsOn: ['merge_sources'],
      onError: 'fail'
    },

    // Phase 5: Apply transformations (parallel operations)
    {
      id: 'transform_normalize',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('clean_data')}' | jq 'map(.name |= ascii_downcase)'`,
        workingDir: '.'
      }),
      dependsOn: ['clean_data'],
      onError: 'fail',
      parallel: true
    },

    {
      id: 'transform_enrich',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('clean_data')}' | jq 'map(. + {processedAt: now | todate})'`,
        workingDir: '.'
      }),
      dependsOn: ['clean_data'],
      onError: 'fail',
      parallel: true
    },

    // Phase 6: Merge transformations
    {
      id: 'merge_transformations',
      toolName: 'execute_shell',
      input: (ctx) => {
        const normalized = ctx.results.get('transform_normalize');
        const enriched = ctx.results.get('transform_enrich');

        return {
          command: `jq -n --argjson a '${normalized}' --argjson b '${enriched}' '[$a, $b] | transpose | map(add)'`,
          workingDir: '.'
        };
      },
      dependsOn: ['transform_normalize', 'transform_enrich'],
      onError: 'fail'
    },

    // Phase 7: Validate output schema
    {
      id: 'validate_output',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('merge_transformations')}' | jq -e 'type == "array" and length > 0'`,
        workingDir: '.'
      }),
      dependsOn: ['merge_transformations'],
      onError: 'fail'
    },

    // Phase 8: Quality checks (parallel)
    {
      id: 'check_duplicates',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('merge_transformations')}' | jq 'group_by(.id) | map(length) | map(select(. > 1)) | length == 0'`,
        workingDir: '.'
      }),
      dependsOn: ['validate_output'],
      onError: 'continue', // Warn but don't fail
      parallel: true
    },

    {
      id: 'check_null_values',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('merge_transformations')}' | jq 'map(select(.id == null or .name == null)) | length == 0'`,
        workingDir: '.'
      }),
      dependsOn: ['validate_output'],
      onError: 'continue', // Warn but don't fail
      parallel: true
    },

    // Phase 9: Write output files (parallel writes)
    {
      id: 'write_json_output',
      toolName: 'write_file',
      input: (ctx) => ({
        path: './data/output/processed.json',
        content: JSON.stringify(ctx.results.get('merge_transformations'), null, 2)
      }),
      dependsOn: ['validate_output'],
      onError: 'fail',
      parallel: true
    },

    {
      id: 'write_csv_output',
      toolName: 'execute_shell',
      input: (ctx) => ({
        command: `echo '${ctx.results.get('merge_transformations')}' | jq -r '(.[0] | keys_unsorted) as $keys | $keys, map([.[ $keys[] ]])[] | @csv' > ./data/output/processed.csv`,
        workingDir: '.'
      }),
      dependsOn: ['validate_output'],
      onError: 'continue', // CSV is optional
      parallel: true
    },

    // Phase 10: Generate processing report
    {
      id: 'generate_report',
      toolName: 'write_file',
      input: (ctx) => {
        const inputCount = JSON.parse(ctx.results.get('merge_sources')).length;
        const outputCount = JSON.parse(ctx.results.get('merge_transformations')).length;
        const hasDuplicates = !ctx.results.get('check_duplicates');
        const hasNulls = !ctx.results.get('check_null_values');

        const report = {
          timestamp: new Date().toISOString(),
          pipeline: 'data_processing',
          stats: {
            inputRecords: inputCount,
            outputRecords: outputCount,
            recordsRemoved: inputCount - outputCount,
            hasDuplicates,
            hasNullValues: hasNulls
          },
          sources: {
            source1: !!ctx.results.get('read_source_1'),
            source2: !!ctx.results.get('read_source_2'),
            source3: !!ctx.results.get('read_source_3')
          },
          outputs: {
            json: !!ctx.results.get('write_json_output'),
            csv: !!ctx.results.get('write_csv_output')
          },
          status: 'completed'
        };

        return {
          path: './data/output/processing-report.json',
          content: JSON.stringify(report, null, 2)
        };
      },
      dependsOn: ['write_json_output', 'check_duplicates', 'check_null_values'],
      onError: 'continue'
    },

    // Phase 11: Log completion
    {
      id: 'log_completion',
      toolName: 'execute_shell',
      input: (ctx) => {
        const report = JSON.parse(ctx.results.get('generate_report'));
        return {
          command: `echo "✅ Data processing completed: ${report.stats.outputRecords} records processed"`,
          workingDir: '.'
        };
      },
      dependsOn: ['generate_report'],
      onError: 'continue'
    }
  ]
};

/**
 * Usage Example:
 *
 * import { workflowManager } from './src/core/workflow-manager';
 * import { dataProcessingWorkflow } from './examples/workflows/data-processing';
 *
 * // Prepare input data
 * await fs.writeFile('./data/input/source1.json', JSON.stringify([
 *   { id: 1, name: 'Alice', age: 30 },
 *   { id: 2, name: 'Bob', age: 25 }
 * ]));
 *
 * // Run data processing workflow
 * const result = await workflowManager.execute(dataProcessingWorkflow, {
 *   userId: 'data-engineer',
 *   userRequest: 'Process customer data from multiple sources'
 * });
 *
 * // Check report
 * const report = JSON.parse(result.generate_report);
 * console.log('Processing stats:', report.stats);
 * console.log('Output records:', report.stats.outputRecords);
 */

/**
 * Workflow Visualization:
 *
 * [read_src1] ----\
 * [read_src2] ------> [validate] --> [merge] --> [clean] --> [normalize] --\
 * [read_src3] ----/                                          [enrich]    ----> [merge_tfm] --> [validate_out]
 *                                                                                                      |
 *                                                                        [check_dups] <---------------+
 *                                                                        [check_nulls] <--------------+
 *                                                                        [write_json] <---------------+
 *                                                                        [write_csv] <----------------+
 *                                                                                |
 *                                                                        [generate_report] <----------+
 *                                                                                |
 *                                                                        [log_completion] <-----------+
 *
 * Expected Duration: 1-5 minutes (depends on data volume)
 * Parallel Steps: 9 steps run in parallel across different phases
 */

/**
 * Input Data Format:
 * [
 *   { "id": 1, "name": "Alice", "age": 30 },
 *   { "id": 2, "name": "Bob", "age": 25 }
 * ]
 *
 * Output Data Format:
 * [
 *   { "id": 1, "name": "alice", "age": 30, "processedAt": "2026-02-04T18:00:00Z" },
 *   { "id": 2, "name": "bob", "age": 25, "processedAt": "2026-02-04T18:00:00Z" }
 * ]
 */
