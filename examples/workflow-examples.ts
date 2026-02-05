/**
 * Comprehensive Workflow Examples
 *
 * This file contains practical workflow examples for common use cases:
 * 1. Code Review Workflow
 * 2. Testing Workflow
 * 3. Documentation Generation Workflow
 * 4. Analytics/Reporting Workflow
 * 5. Backup Workflow
 */

import { WorkflowManager, WorkflowDefinition } from '../src/core/workflow-manager';

const workflowManager = new WorkflowManager();

// ==========================================
// Example 1: Code Review Workflow
// ==========================================

/**
 * Automated code review workflow that:
 * - Fetches code changes
 * - Runs static analysis
 * - Checks test coverage
 * - Reviews code style
 * - Generates review report
 */
export const codeReviewWorkflow: WorkflowDefinition = {
  name: 'code_review',
  description: 'Automated code review process',
  steps: [
    {
      id: 'fetch_changes',
      toolName: 'git_diff',
      input: {
        branch: 'main',
        target: 'feature-branch',
      },
    },
    {
      id: 'static_analysis',
      toolName: 'eslint',
      input: (context) => ({
        files: context.results.get('fetch_changes')?.files || [],
        rules: 'recommended',
      }),
      dependsOn: ['fetch_changes'],
    },
    {
      id: 'check_coverage',
      toolName: 'coverage_check',
      input: (context) => ({
        files: context.results.get('fetch_changes')?.files || [],
        threshold: 80, // 80% coverage required
      }),
      dependsOn: ['fetch_changes'],
      parallel: true, // Run in parallel with static_analysis
    },
    {
      id: 'style_check',
      toolName: 'prettier',
      input: (context) => ({
        files: context.results.get('fetch_changes')?.files || [],
        fix: false, // Just check, don't fix
      }),
      dependsOn: ['fetch_changes'],
      parallel: true,
    },
    {
      id: 'security_scan',
      toolName: 'security_scanner',
      input: (context) => ({
        files: context.results.get('fetch_changes')?.files || [],
        severity: ['high', 'critical'],
      }),
      dependsOn: ['fetch_changes'],
      parallel: true,
    },
    {
      id: 'generate_report',
      toolName: 'code_review_report',
      input: (context) => ({
        linting: context.results.get('static_analysis'),
        coverage: context.results.get('check_coverage'),
        style: context.results.get('style_check'),
        security: context.results.get('security_scan'),
      }),
      dependsOn: ['static_analysis', 'check_coverage', 'style_check', 'security_scan'],
    },
    {
      id: 'post_comment',
      toolName: 'github_comment',
      input: (context) => ({
        pr_number: context.userRequest,
        comment: context.results.get('generate_report')?.markdown,
      }),
      dependsOn: ['generate_report'],
      condition: (context) => {
        // Only post if there are issues
        const report = context.results.get('generate_report');
        return report?.hasIssues === true;
      },
    },
  ],
  maxDuration: 5 * 60 * 1000, // 5 minutes timeout
};

async function runCodeReviewExample() {
  console.log('=== Code Review Workflow ===\n');

  const result = await workflowManager.execute(codeReviewWorkflow, {
    userId: 'developer1',
    userRequest: '123', // PR number
  });

  console.log('Code review completed!');
  console.log('Report:', result);
  console.log();
}

// ==========================================
// Example 2: Testing Workflow
// ==========================================

/**
 * Comprehensive testing workflow that:
 * - Runs unit tests
 * - Runs integration tests
 * - Runs E2E tests
 * - Generates coverage report
 * - Uploads results
 */
export const testingWorkflow: WorkflowDefinition = {
  name: 'testing_pipeline',
  description: 'Comprehensive testing workflow',
  steps: [
    {
      id: 'setup_environment',
      toolName: 'test_setup',
      input: {
        database: 'test',
        clean: true,
      },
    },
    {
      id: 'run_unit_tests',
      toolName: 'jest',
      input: {
        testMatch: ['**/*.test.ts'],
        coverage: true,
        maxWorkers: 4,
      },
      dependsOn: ['setup_environment'],
    },
    {
      id: 'run_integration_tests',
      toolName: 'jest',
      input: {
        testMatch: ['**/*.integration.test.ts'],
        coverage: true,
        setupFiles: ['./test/integration-setup.ts'],
      },
      dependsOn: ['setup_environment'],
      parallel: true, // Run in parallel with unit tests
    },
    {
      id: 'run_e2e_tests',
      toolName: 'playwright',
      input: {
        browser: 'chromium',
        headless: true,
        workers: 2,
      },
      dependsOn: ['setup_environment'],
      parallel: true,
    },
    {
      id: 'merge_coverage',
      toolName: 'coverage_merge',
      input: (context) => ({
        reports: [
          context.results.get('run_unit_tests')?.coverage,
          context.results.get('run_integration_tests')?.coverage,
        ],
      }),
      dependsOn: ['run_unit_tests', 'run_integration_tests'],
    },
    {
      id: 'check_thresholds',
      toolName: 'coverage_threshold',
      input: (context) => ({
        coverage: context.results.get('merge_coverage'),
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      }),
      dependsOn: ['merge_coverage'],
      onError: 'fail', // Fail workflow if coverage too low
    },
    {
      id: 'generate_html_report',
      toolName: 'coverage_html',
      input: (context) => ({
        coverage: context.results.get('merge_coverage'),
        outputDir: './coverage/html',
      }),
      dependsOn: ['merge_coverage'],
    },
    {
      id: 'upload_results',
      toolName: 'test_results_upload',
      input: (context) => ({
        unitTests: context.results.get('run_unit_tests'),
        integrationTests: context.results.get('run_integration_tests'),
        e2eTests: context.results.get('run_e2e_tests'),
        coverage: context.results.get('merge_coverage'),
        reportUrl: context.results.get('generate_html_report')?.url,
      }),
      dependsOn: ['run_unit_tests', 'run_integration_tests', 'run_e2e_tests', 'generate_html_report'],
    },
    {
      id: 'cleanup',
      toolName: 'test_cleanup',
      input: {
        database: 'test',
        tempFiles: true,
      },
      dependsOn: ['upload_results'],
      onError: 'continue', // Always cleanup even if upload fails
    },
  ],
  maxDuration: 15 * 60 * 1000, // 15 minutes timeout
};

async function runTestingExample() {
  console.log('=== Testing Workflow ===\n');

  const result = await workflowManager.execute(testingWorkflow, {
    userId: 'ci-system',
    userRequest: 'Run full test suite',
  });

  console.log('Testing completed!');
  console.log('Results:', result);
  console.log();
}

// ==========================================
// Example 3: Documentation Generation Workflow
// ==========================================

/**
 * Automated documentation generation workflow that:
 * - Analyzes codebase
 * - Extracts API signatures
 * - Generates API docs
 * - Creates tutorials
 * - Builds documentation site
 * - Deploys to hosting
 */
export const documentationWorkflow: WorkflowDefinition = {
  name: 'documentation_generation',
  description: 'Generate and deploy documentation',
  steps: [
    {
      id: 'analyze_codebase',
      toolName: 'code_analyzer',
      input: {
        directories: ['src/'],
        exclude: ['**/*.test.ts', 'node_modules'],
        extractTypes: true,
      },
    },
    {
      id: 'extract_api_signatures',
      toolName: 'api_extractor',
      input: (context) => ({
        files: context.results.get('analyze_codebase')?.files,
        includePrivate: false,
      }),
      dependsOn: ['analyze_codebase'],
    },
    {
      id: 'generate_api_docs',
      toolName: 'typedoc',
      input: (context) => ({
        entryPoints: context.results.get('extract_api_signatures')?.entryPoints,
        outputDir: './docs/api',
        theme: 'default',
      }),
      dependsOn: ['extract_api_signatures'],
    },
    {
      id: 'extract_examples',
      toolName: 'example_extractor',
      input: {
        directories: ['examples/'],
        format: 'markdown',
      },
      dependsOn: ['analyze_codebase'],
      parallel: true,
    },
    {
      id: 'generate_tutorials',
      toolName: 'tutorial_generator',
      input: (context) => ({
        examples: context.results.get('extract_examples')?.examples,
        apiDocs: context.results.get('generate_api_docs')?.toc,
        outputDir: './docs/tutorials',
      }),
      dependsOn: ['extract_examples', 'generate_api_docs'],
    },
    {
      id: 'check_links',
      toolName: 'link_checker',
      input: {
        baseDir: './docs',
        checkExternal: true,
      },
      dependsOn: ['generate_api_docs', 'generate_tutorials'],
    },
    {
      id: 'build_site',
      toolName: 'docusaurus_build',
      input: {
        sourceDir: './docs',
        outputDir: './build/docs',
        minify: true,
      },
      dependsOn: ['check_links'],
    },
    {
      id: 'optimize_images',
      toolName: 'image_optimizer',
      input: (context) => ({
        directory: context.results.get('build_site')?.outputDir,
        quality: 85,
      }),
      dependsOn: ['build_site'],
    },
    {
      id: 'deploy_docs',
      toolName: 'vercel_deploy',
      input: (context) => ({
        directory: context.results.get('build_site')?.outputDir,
        project: 'my-docs',
        production: true,
      }),
      dependsOn: ['optimize_images'],
    },
    {
      id: 'invalidate_cache',
      toolName: 'cdn_invalidate',
      input: {
        distribution: 'docs-cdn',
        paths: ['/*'],
      },
      dependsOn: ['deploy_docs'],
    },
    {
      id: 'notify_team',
      toolName: 'slack_notification',
      input: (context) => ({
        channel: '#docs',
        message: `📚 Documentation deployed! ${context.results.get('deploy_docs')?.url}`,
      }),
      dependsOn: ['deploy_docs'],
    },
  ],
  maxDuration: 10 * 60 * 1000, // 10 minutes timeout
};

async function runDocumentationExample() {
  console.log('=== Documentation Generation Workflow ===\n');

  const result = await workflowManager.execute(documentationWorkflow, {
    userId: 'docs-bot',
    userRequest: 'Generate and deploy docs',
  });

  console.log('Documentation generation completed!');
  console.log('Deployment URL:', result);
  console.log();
}

// ==========================================
// Example 4: Analytics/Reporting Workflow
// ==========================================

/**
 * Analytics and reporting workflow that:
 * - Collects metrics from various sources
 * - Processes and aggregates data
 * - Generates charts and visualizations
 * - Creates PDF report
 * - Distributes to stakeholders
 */
export const analyticsWorkflow: WorkflowDefinition = {
  name: 'analytics_reporting',
  description: 'Generate and distribute analytics reports',
  steps: [
    {
      id: 'collect_metrics',
      toolName: 'metrics_collector',
      input: {
        sources: ['database', 'api_logs', 'user_events'],
        timeRange: 'last_7_days',
      },
    },
    {
      id: 'query_database',
      toolName: 'database_query',
      input: {
        queries: [
          'SELECT COUNT(*) as users FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY',
          'SELECT AVG(response_time) as avg_response FROM api_logs WHERE timestamp >= NOW() - INTERVAL 7 DAY',
        ],
      },
      dependsOn: ['collect_metrics'],
    },
    {
      id: 'fetch_api_stats',
      toolName: 'api_stats',
      input: {
        endpoints: ['*'],
        metrics: ['requests', 'errors', 'latency'],
        period: '7d',
      },
      dependsOn: ['collect_metrics'],
      parallel: true,
    },
    {
      id: 'fetch_user_engagement',
      toolName: 'analytics_query',
      input: {
        metrics: ['dau', 'wau', 'retention', 'session_duration'],
        segmentation: ['platform', 'country'],
      },
      dependsOn: ['collect_metrics'],
      parallel: true,
    },
    {
      id: 'aggregate_data',
      toolName: 'data_aggregator',
      input: (context) => ({
        database: context.results.get('query_database'),
        api: context.results.get('fetch_api_stats'),
        engagement: context.results.get('fetch_user_engagement'),
      }),
      dependsOn: ['query_database', 'fetch_api_stats', 'fetch_user_engagement'],
    },
    {
      id: 'calculate_kpis',
      toolName: 'kpi_calculator',
      input: (context) => ({
        data: context.results.get('aggregate_data'),
        kpis: [
          'growth_rate',
          'churn_rate',
          'arpu',
          'nps',
          'api_success_rate',
        ],
      }),
      dependsOn: ['aggregate_data'],
    },
    {
      id: 'generate_charts',
      toolName: 'chart_generator',
      input: (context) => ({
        data: context.results.get('aggregate_data'),
        charts: [
          { type: 'line', metric: 'users', title: 'User Growth' },
          { type: 'bar', metric: 'api_requests', title: 'API Usage' },
          { type: 'pie', metric: 'platform_distribution', title: 'Platform Split' },
        ],
        outputFormat: 'png',
      }),
      dependsOn: ['aggregate_data'],
    },
    {
      id: 'create_summary',
      toolName: 'report_summarizer',
      input: (context) => ({
        kpis: context.results.get('calculate_kpis'),
        insights: 'auto', // Auto-generate insights
        format: 'markdown',
      }),
      dependsOn: ['calculate_kpis'],
    },
    {
      id: 'generate_pdf',
      toolName: 'pdf_generator',
      input: (context) => ({
        summary: context.results.get('create_summary')?.markdown,
        charts: context.results.get('generate_charts')?.files,
        template: 'executive_report',
        outputFile: 'weekly_analytics.pdf',
      }),
      dependsOn: ['create_summary', 'generate_charts'],
    },
    {
      id: 'upload_report',
      toolName: 's3_upload',
      input: (context) => ({
        file: context.results.get('generate_pdf')?.path,
        bucket: 'reports',
        key: `analytics/weekly_${new Date().toISOString().split('T')[0]}.pdf`,
        acl: 'private',
      }),
      dependsOn: ['generate_pdf'],
    },
    {
      id: 'email_stakeholders',
      toolName: 'email_sender',
      input: (context) => ({
        to: ['executives@company.com', 'product@company.com'],
        subject: 'Weekly Analytics Report',
        body: context.results.get('create_summary')?.text,
        attachments: [context.results.get('generate_pdf')?.path],
      }),
      dependsOn: ['generate_pdf'],
    },
    {
      id: 'post_to_slack',
      toolName: 'slack_notification',
      input: (context) => ({
        channel: '#analytics',
        message: '📊 Weekly analytics report is ready!',
        attachments: [
          {
            title: 'Key Metrics',
            fields: context.results.get('calculate_kpis')?.summary,
          },
        ],
        link: context.results.get('upload_report')?.url,
      }),
      dependsOn: ['upload_report'],
    },
  ],
  maxDuration: 20 * 60 * 1000, // 20 minutes timeout
};

async function runAnalyticsExample() {
  console.log('=== Analytics/Reporting Workflow ===\n');

  const result = await workflowManager.execute(analyticsWorkflow, {
    userId: 'analytics-system',
    userRequest: 'Generate weekly report',
  });

  console.log('Analytics report completed!');
  console.log('Report details:', result);
  console.log();
}

// ==========================================
// Example 5: Backup Workflow
// ==========================================

/**
 * Comprehensive backup workflow that:
 * - Backs up database
 * - Backs up file storage
 * - Compresses backups
 * - Encrypts sensitive data
 * - Uploads to multiple locations
 * - Verifies backup integrity
 * - Cleans up old backups
 */
export const backupWorkflow: WorkflowDefinition = {
  name: 'comprehensive_backup',
  description: 'Create and verify system backups',
  steps: [
    {
      id: 'prepare_backup_dir',
      toolName: 'filesystem',
      input: {
        operation: 'mkdir',
        path: `/tmp/backup_${Date.now()}`,
      },
    },
    {
      id: 'backup_database',
      toolName: 'pg_dump',
      input: (context) => ({
        database: 'production',
        outputFile: `${context.results.get('prepare_backup_dir')?.path}/database.sql`,
        format: 'custom',
        compress: 9,
      }),
      dependsOn: ['prepare_backup_dir'],
    },
    {
      id: 'backup_redis',
      toolName: 'redis_backup',
      input: (context) => ({
        outputFile: `${context.results.get('prepare_backup_dir')?.path}/redis.rdb`,
      }),
      dependsOn: ['prepare_backup_dir'],
      parallel: true,
    },
    {
      id: 'backup_uploads',
      toolName: 's3_sync',
      input: (context) => ({
        source: 's3://uploads-bucket/',
        destination: `${context.results.get('prepare_backup_dir')?.path}/uploads/`,
      }),
      dependsOn: ['prepare_backup_dir'],
      parallel: true,
    },
    {
      id: 'backup_configs',
      toolName: 'file_copy',
      input: (context) => ({
        source: './config/',
        destination: `${context.results.get('prepare_backup_dir')?.path}/configs/`,
        exclude: ['*.secret', '*.key'],
      }),
      dependsOn: ['prepare_backup_dir'],
      parallel: true,
    },
    {
      id: 'compress_backup',
      toolName: 'tar_compress',
      input: (context) => ({
        sourceDir: context.results.get('prepare_backup_dir')?.path,
        outputFile: `/tmp/backup_${Date.now()}.tar.gz`,
        compression: 'gzip',
        level: 9,
      }),
      dependsOn: ['backup_database', 'backup_redis', 'backup_uploads', 'backup_configs'],
    },
    {
      id: 'encrypt_backup',
      toolName: 'gpg_encrypt',
      input: (context) => ({
        file: context.results.get('compress_backup')?.outputFile,
        recipient: 'backup@company.com',
        outputFile: `${context.results.get('compress_backup')?.outputFile}.gpg`,
      }),
      dependsOn: ['compress_backup'],
    },
    {
      id: 'calculate_checksum',
      toolName: 'checksum',
      input: (context) => ({
        file: context.results.get('encrypt_backup')?.outputFile,
        algorithm: 'sha256',
      }),
      dependsOn: ['encrypt_backup'],
    },
    {
      id: 'upload_to_s3',
      toolName: 's3_upload',
      input: (context) => ({
        file: context.results.get('encrypt_backup')?.outputFile,
        bucket: 'backups-primary',
        key: `daily/${new Date().toISOString().split('T')[0]}/backup.tar.gz.gpg`,
        storageClass: 'GLACIER',
      }),
      dependsOn: ['encrypt_backup', 'calculate_checksum'],
    },
    {
      id: 'upload_to_gcs',
      toolName: 'gcs_upload',
      input: (context) => ({
        file: context.results.get('encrypt_backup')?.outputFile,
        bucket: 'backups-secondary',
        path: `daily/${new Date().toISOString().split('T')[0]}/backup.tar.gz.gpg`,
        storageClass: 'NEARLINE',
      }),
      dependsOn: ['encrypt_backup', 'calculate_checksum'],
      parallel: true, // Upload to GCS in parallel with S3
    },
    {
      id: 'verify_s3_upload',
      toolName: 's3_head',
      input: (context) => ({
        bucket: 'backups-primary',
        key: context.results.get('upload_to_s3')?.key,
        expectedChecksum: context.results.get('calculate_checksum')?.sha256,
      }),
      dependsOn: ['upload_to_s3'],
    },
    {
      id: 'verify_gcs_upload',
      toolName: 'gcs_metadata',
      input: (context) => ({
        bucket: 'backups-secondary',
        path: context.results.get('upload_to_gcs')?.path,
        expectedChecksum: context.results.get('calculate_checksum')?.sha256,
      }),
      dependsOn: ['upload_to_gcs'],
    },
    {
      id: 'cleanup_local',
      toolName: 'filesystem',
      input: (context) => ({
        operation: 'rm',
        paths: [
          context.results.get('prepare_backup_dir')?.path,
          context.results.get('compress_backup')?.outputFile,
          context.results.get('encrypt_backup')?.outputFile,
        ],
        recursive: true,
      }),
      dependsOn: ['verify_s3_upload', 'verify_gcs_upload'],
      onError: 'continue', // Continue even if cleanup fails
    },
    {
      id: 'cleanup_old_backups',
      toolName: 'backup_retention',
      input: {
        s3Bucket: 'backups-primary',
        gcsBucket: 'backups-secondary',
        retentionDays: 30,
        keepMinimum: 7, // Always keep at least 7 backups
      },
      dependsOn: ['verify_s3_upload', 'verify_gcs_upload'],
    },
    {
      id: 'log_backup',
      toolName: 'database_insert',
      input: (context) => ({
        table: 'backup_logs',
        data: {
          timestamp: new Date(),
          size_bytes: context.results.get('encrypt_backup')?.size,
          checksum: context.results.get('calculate_checksum')?.sha256,
          s3_location: context.results.get('upload_to_s3')?.url,
          gcs_location: context.results.get('upload_to_gcs')?.url,
          status: 'completed',
        },
      }),
      dependsOn: ['verify_s3_upload', 'verify_gcs_upload'],
    },
    {
      id: 'notify_success',
      toolName: 'slack_notification',
      input: (context) => ({
        channel: '#ops',
        message: '✅ Daily backup completed successfully',
        attachments: [
          {
            title: 'Backup Details',
            fields: [
              {
                title: 'Size',
                value: `${(context.results.get('encrypt_backup')?.size / 1024 / 1024).toFixed(2)} MB`,
                short: true,
              },
              {
                title: 'Duration',
                value: `${((Date.now() - context.startTime) / 1000).toFixed(1)}s`,
                short: true,
              },
            ],
          },
        ],
      }),
      dependsOn: ['log_backup'],
    },
  ],
  maxDuration: 30 * 60 * 1000, // 30 minutes timeout
};

async function runBackupExample() {
  console.log('=== Backup Workflow ===\n');

  const result = await workflowManager.execute(backupWorkflow, {
    userId: 'backup-system',
    userRequest: 'Run daily backup',
  });

  console.log('Backup completed!');
  console.log('Backup details:', result);
  console.log();
}

// ==========================================
// Run All Examples
// ==========================================

export async function runAllWorkflowExamples() {
  console.log('========================================');
  console.log('  Comprehensive Workflow Examples');
  console.log('========================================\n');

  try {
    // Note: These examples require actual tool implementations
    // They demonstrate the workflow structure and patterns

    console.log('📋 Available Workflows:\n');
    console.log('1. Code Review Workflow');
    console.log('   - Static analysis, coverage checks, security scanning');
    console.log('   - Parallel execution of checks');
    console.log('   - Automated PR comments\n');

    console.log('2. Testing Workflow');
    console.log('   - Unit, integration, and E2E tests');
    console.log('   - Coverage thresholds');
    console.log('   - Parallel test execution\n');

    console.log('3. Documentation Generation Workflow');
    console.log('   - API documentation generation');
    console.log('   - Tutorial creation');
    console.log('   - Automated deployment\n');

    console.log('4. Analytics/Reporting Workflow');
    console.log('   - Data collection from multiple sources');
    console.log('   - KPI calculation');
    console.log('   - PDF report generation and distribution\n');

    console.log('5. Backup Workflow');
    console.log('   - Multi-source backup (DB, Redis, files)');
    console.log('   - Encryption and compression');
    console.log('   - Multi-location upload with verification\n');

    // Uncomment to run actual workflows (requires tool implementations):
    // await runCodeReviewExample();
    // await runTestingExample();
    // await runDocumentationExample();
    // await runAnalyticsExample();
    // await runBackupExample();

    console.log('✅ All workflow examples loaded successfully!');
    console.log('\nTo use these workflows:');
    console.log('1. Import the workflow definition');
    console.log('2. Implement the required tools');
    console.log('3. Execute with workflowManager.execute()');
    console.log();

  } catch (error) {
    console.error('❌ Error running workflow examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllWorkflowExamples();
}
