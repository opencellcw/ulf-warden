# Workflow Conditional Branching System

Comprehensive guide to implementing conditional branching in OpenCellCW workflows using if/else and switch/case logic.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [If/Else Branching](#ifelse-branching)
5. [Switch/Case Branching](#switchcase-branching)
6. [Usage Examples](#usage-examples)
7. [Advanced Topics](#advanced-topics)
8. [Reference](#reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Conditional branching allows workflows to make decisions at runtime and execute different steps based on conditions or values. This enables dynamic workflows that adapt to different inputs, states, and outcomes.

### What is Conditional Branching?

Conditional branching is the ability to:
- **Evaluate conditions** at runtime to determine which steps to execute
- **Execute different paths** based on step results or external state
- **Handle dynamic workflows** that respond to their environment
- **Reduce workflow complexity** by avoiding conditional logic in individual steps

### Why Use Conditional Branching?

- **Cleaner workflows**: No need to embed decision logic in tools
- **Maintainability**: Easier to understand and modify workflow logic
- **Reusability**: Same tools can be used in different contexts
- **Scalability**: Support complex, multi-path execution flows

### Common Use Cases

- Routing based on user type or status
- Error handling and recovery paths
- Feature flags and A/B testing
- Content formatting based on data size
- Role-based permission handling
- Sequential decision trees

---

## Features

### If/Else Branching

Execute one set of steps if a condition is true, another if false.

**Capabilities:**
- String expressions with variable access
- Function conditions for complex logic
- Comparison operators (==, !=, >, <, >=, <=)
- Logical operators (&&, ||, !)
- Access to step results ($results)
- Optional else branch

**When to use:**
- Binary decisions (yes/no)
- Condition-based routing
- Error detection and handling
- Status checking

### Switch/Case Branching

Execute different steps based on the value of an expression.

**Capabilities:**
- Value matching for different cases
- Default fallback case
- Multiple cases with same steps
- Expression evaluation
- Type-safe matching

**When to use:**
- Routing based on type or status
- Multi-path workflows
- Enum-like decisions
- State machines

### Condition Evaluation

The system evaluates conditions safely and robustly:
- **String expressions**: Lightweight, readable syntax
- **Function conditions**: Full TypeScript power and flexibility
- **Error handling**: Graceful fallback on evaluation errors
- **Context access**: Full workflow context available

### Expression Syntax

String expressions provide a simple, safe way to express conditions without executing arbitrary code.

**Supported operators:**
- Comparison: `==`, `!=`, `===`, `!==`, `>`, `<`, `>=`, `<=`
- Logical: `&&`, `||`, `!`
- Literals: `true`, `false`, `null`, `undefined`, numbers, strings
- Variables: `$results`, `$errors`

**Example expressions:**
```javascript
$results.fetch_user.status == 'active'
$results.user.age > 18 && $results.user.status == 'verified'
$results.error != null || !$results.success
```

### Dynamic Conditions

Conditions are evaluated at runtime with full access to:
- Previous step results
- Errors that occurred
- User and request context
- Any data available in the workflow context

---

## Architecture

### How Branches Integrate with Workflow Manager

The workflow system uses a modular architecture for branch handling:

```typescript
// workflow-manager.ts
- WorkflowManager.execute() - Main execution loop
  - executeStep() - Execute individual steps
    - Handles branch steps (branches don't execute tools)
    - Uses BranchResolver to determine next steps
    - Recursively executes resolved branch steps

// workflow-conditions.ts
- ConditionEvaluator - Evaluates conditions and expressions
  - evaluate() - For if/else conditions
  - evaluateValue() - For switch expressions
  - evaluateExpression() - Internal expression parser
  - resolveValue() - Resolve literals and variables
  - resolveContextVariable() - Access $results, $errors

- BranchResolver - Determines which steps to execute
  - resolve() - Route to correct resolver
  - resolveConditional() - Handle if/else
  - resolveSwitch() - Handle switch/case
  - valuesEqual() - Deep equality checking
```

### Execution Flow

```
1. WorkflowManager.execute(workflow, context)
   │
   ├─ Build dependency graph
   ├─ Execute steps in topological order
   │
   └─ For each step:
      │
      ├─ If step.branch is defined:
      │  │
      │  ├─ BranchResolver.resolve(branch, context)
      │  │  │
      │  │  ├─ If type='if':
      │  │  │  ├─ ConditionEvaluator.evaluate(condition, context)
      │  │  │  ├─ Return thenSteps or elseSteps
      │  │  │
      │  │  └─ If type='switch':
      │  │     ├─ ConditionEvaluator.evaluateValue(expression, context)
      │  │     ├─ Find matching case
      │  │     ├─ Return matching steps or defaultSteps
      │  │
      │  └─ Recursively execute returned steps
      │
      └─ Else: Execute tool normally
```

### Key Concepts

**Branch Step**: A workflow step that contains a branch definition. Unlike regular steps, it doesn't execute a tool but determines which steps to execute next.

**Condition**: A boolean expression or function that determines branch direction.

**Expression**: A value-returning expression or function used in switch statements.

**Resolver**: Component that evaluates conditions and returns the list of steps to execute.

---

## If/Else Branching

### If/Else Syntax

Define conditional branches with the following structure:

```typescript
interface ConditionalBranch {
  type: 'if';
  condition: string | ((context: WorkflowContext) => boolean);
  thenSteps: string[]; // Required: steps to execute if true
  elseSteps?: string[]; // Optional: steps to execute if false
}
```

### Basic If/Else Example

**YAML Example:**
```yaml
steps:
  - id: check_status
    branch:
      type: if
      condition: "$results.fetch_user.status == 'active'"
      thenSteps:
        - send_welcome_email
      elseSteps:
        - send_reactivation_email

  - id: send_welcome_email
    toolName: send_email
    input:
      subject: "Welcome!"
      body: "Your account is active"

  - id: send_reactivation_email
    toolName: send_email
    input:
      subject: "Reactivate your account"
      body: "Your account has been suspended"
```

**TypeScript Example:**
```typescript
const branch: ConditionalBranch = {
  type: 'if',
  condition: '$results.fetch_user.status == "active"',
  thenSteps: ['send_welcome_email'],
  elseSteps: ['send_reactivation_email']
};

const step: WorkflowStep = {
  id: 'check_status',
  branch
};
```

### Condition Expressions

Conditions can be expressed as strings or functions. Choose the approach that fits your needs.

#### String Expressions

**Advantages:**
- Simple and readable
- Easy to log and debug
- No escaping issues
- Good for simple conditions

**Syntax:**
```
comparison_expression ::= value comparison_op value
logical_expression     ::= expression logical_op expression
                         | "!" expression
comparison_op          ::= "==" | "!=" | "===" | "!==" | ">" | "<" | ">=" | "<="
logical_op             ::= "&&" | "||"
value                  ::= literal | variable
literal                ::= "true" | "false" | number | string | "null" | "undefined"
variable               ::= "$results." identifier ("." identifier)*
                         | "$errors." identifier ("." identifier)*
```

**Examples:**
```javascript
// Simple equality
"$results.user.status == 'active'"

// Comparison
"$results.user.age > 18"

// Logical AND
"$results.user.status == 'active' && $results.user.verified == true"

// Logical OR
"$results.role == 'admin' || $results.role == 'moderator'"

// Negation
"!$results.deleted"

// Multiple conditions
"$results.age > 18 && $results.verified == true && $results.status == 'active'"
```

#### Function Conditions

**Advantages:**
- Full TypeScript power
- Complex logic and calculations
- Access to all context properties
- Better for sophisticated conditions

**Syntax:**
```typescript
condition: (context: WorkflowContext) => boolean
```

**Examples:**
```typescript
// Simple function
condition: (ctx) => ctx.results.get('user')?.status === 'active'

// Complex logic
condition: (ctx) => {
  const user = ctx.results.get('user');
  const riskScore = ctx.results.get('analyze')?.riskScore || 0;
  return user?.verified && riskScore < 5;
}

// Check for missing results
condition: (ctx) => {
  const dataSteps = ['fetch_db', 'fetch_api', 'fetch_file'];
  return dataSteps.some(step => ctx.results.has(step));
}

// Complex business logic
condition: (ctx) => {
  const order = ctx.results.get('order');
  const user = ctx.results.get('user');

  if (!order || !user) return false;

  const totalSpent = user.previousOrders?.reduce((sum, o) => sum + o.amount, 0) || 0;
  const isVIP = totalSpent > 10000;
  const orderValue = order.total;

  return isVIP || orderValue > 1000;
}
```

### Expression Syntax Reference

#### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Loose equality | `$results.status == 'active'` |
| `!=` | Loose inequality | `$results.count != 0` |
| `===` | Strict equality | `$results.verified === true` |
| `!==` | Strict inequality | `$results.deleted !== true` |
| `>` | Greater than | `$results.age > 18` |
| `<` | Less than | `$results.age < 65` |
| `>=` | Greater or equal | `$results.score >= 100` |
| `<=` | Less or equal | `$results.score <= 100` |

#### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | AND (both true) | `$results.a == true && $results.b == true` |
| `\|\|` | OR (at least one true) | `$results.role == 'admin' \|\| $results.role == 'mod'` |
| `!` | NOT (negate) | `!$results.deleted` |

#### Literals

| Type | Syntax | Examples |
|------|--------|----------|
| Boolean | `true`, `false` | `true`, `false` |
| Number | Decimal notation | `42`, `3.14`, `-10`, `0.5` |
| String | Quoted text | `"active"`, `'pending'` |
| Null | `null` | `null` |
| Undefined | `undefined` | `undefined` |

#### Variables

| Type | Syntax | Description |
|------|--------|-------------|
| Step result | `$results.stepId.field` | Access output from a step |
| Nested field | `$results.stepId.obj.nested` | Access nested properties |
| Step error | `$errors.stepId` | Check if step had error |

---

## Switch/Case Branching

### Switch Syntax

Define switch branches with the following structure:

```typescript
interface SwitchBranch {
  type: 'switch';
  expression: string | ((context: WorkflowContext) => any);
  cases: {
    value: any;
    steps: string[];
  }[];
  defaultSteps?: string[];
}
```

### Basic Switch Example

**YAML Example:**
```yaml
steps:
  - id: route_by_user_type
    branch:
      type: switch
      expression: "$results.fetch_user.type"
      cases:
        - value: "premium"
          steps:
            - grant_premium_access
        - value: "basic"
          steps:
            - grant_basic_access
        - value: "trial"
          steps:
            - grant_trial_access
      defaultSteps:
        - handle_unknown_type

  - id: grant_premium_access
    toolName: update_permissions
    input:
      permissions: ["read", "write", "admin", "export"]

  - id: grant_basic_access
    toolName: update_permissions
    input:
      permissions: ["read"]

  - id: grant_trial_access
    toolName: update_permissions
    input:
      permissions: ["read"]
      expiresIn: 604800 # 7 days

  - id: handle_unknown_type
    toolName: log_error
    input:
      message: "Unknown user type"
```

**TypeScript Example:**
```typescript
const branch: SwitchBranch = {
  type: 'switch',
  expression: '$results.fetch_user.type',
  cases: [
    { value: 'premium', steps: ['grant_premium_access'] },
    { value: 'basic', steps: ['grant_basic_access'] },
    { value: 'trial', steps: ['grant_trial_access'] }
  ],
  defaultSteps: ['handle_unknown_type']
};

const step: WorkflowStep = {
  id: 'route_by_user_type',
  branch
};
```

### Case Matching

Cases are matched using deep equality comparison:

#### Primitive Value Matching

```yaml
# String matching
- value: "premium"
  steps: [...]

# Number matching
- value: 42
  steps: [...]

# Boolean matching
- value: true
  steps: [...]

# Null/undefined matching
- value: null
  steps: [...]
```

#### Object Matching

```typescript
// Matches entire object
cases: [
  {
    value: { status: 'active', verified: true },
    steps: ['process_verified_active']
  },
  {
    value: { status: 'active', verified: false },
    steps: ['send_verification_email']
  }
]
```

#### Array Matching

```typescript
// Matches exact array content and order
cases: [
  {
    value: ['read', 'write', 'delete'],
    steps: ['handle_admin']
  },
  {
    value: ['read', 'write'],
    steps: ['handle_user']
  }
]
```

### Default Case

The `defaultSteps` array is executed when no case matches:

```yaml
branch:
  type: switch
  expression: "$results.status"
  cases:
    - value: "success"
      steps: [success_handler]
    - value: "failed"
      steps: [failure_handler]
  defaultSteps:
    - unknown_status_handler
```

### Expression Evaluation

Switch expressions can be strings or functions. They return the value to match against cases.

#### String Expressions

```yaml
# Access nested properties
expression: "$results.user.account.status"

# Expression evaluation returns the actual value
expression: "$results.response.data.type"
```

#### Function Expressions

```typescript
// Extract computed value
expression: (ctx) => {
  const data = ctx.results.get('fetch_data');
  if (!data) return 'no_data';

  const size = JSON.stringify(data).length;
  if (size < 1000) return 'small';
  if (size < 10000) return 'medium';
  return 'large';
}

// Map to enum
expression: (ctx) => {
  const status = ctx.results.get('check_status');
  const mapping = {
    'ready': 'proceed',
    'pending': 'wait',
    'error': 'retry'
  };
  return mapping[status] || 'unknown';
}
```

---

## Usage Examples

### Basic If/Else

**Simple condition checking based on step result:**

```typescript
const workflow: WorkflowDefinition = {
  name: 'Simple Status Check',
  description: 'Check user status and send appropriate email',

  steps: [
    {
      id: 'fetch_user',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM users WHERE id = ?', params: ['user123'] }
    },
    {
      id: 'check_status',
      dependsOn: ['fetch_user'],
      branch: {
        type: 'if',
        condition: '$results.fetch_user.status == "active"',
        thenSteps: ['send_welcome'],
        elseSteps: ['send_reactivation']
      }
    },
    {
      id: 'send_welcome',
      toolName: 'send_email',
      input: {
        to: (ctx) => ctx.results.get('fetch_user').email,
        subject: 'Welcome back!',
        body: 'Your account is active and ready to use'
      }
    },
    {
      id: 'send_reactivation',
      toolName: 'send_email',
      input: {
        to: (ctx) => ctx.results.get('fetch_user').email,
        subject: 'Reactivate your account',
        body: 'Your account has been suspended. Click here to reactivate.'
      }
    }
  ]
};
```

### Complex Conditions

**Multiple conditions with AND/OR logic:**

```typescript
const workflow: WorkflowDefinition = {
  name: 'Complex Approval Workflow',
  description: 'Route requests based on complexity and user role',

  steps: [
    {
      id: 'analyze_request',
      toolName: 'llm_analyze',
      input: { prompt: (ctx) => `Analyze: ${ctx.userRequest}` }
    },
    {
      id: 'check_approval_needed',
      dependsOn: ['analyze_request'],
      branch: {
        type: 'if',
        // Complex string condition
        condition: '$results.analyze_request.complexity > 7 && $results.analyze_request.riskLevel == "high"',
        thenSteps: ['request_approval'],
        elseSteps: ['proceed_directly']
      }
    },
    {
      id: 'request_approval',
      toolName: 'send_approval_request',
      input: {
        approvers: ['admin@company.com'],
        reason: 'High complexity, high risk operation'
      }
    },
    {
      id: 'proceed_directly',
      toolName: 'log_info',
      input: { message: 'No approval needed' }
    }
  ]
};
```

### Function Conditions

**Using TypeScript functions for complex business logic:**

```typescript
const workflow: WorkflowDefinition = {
  name: 'VIP Customer Handling',
  description: 'Give VIP treatment to high-value customers',

  steps: [
    {
      id: 'fetch_customer',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM customers WHERE id = ?', params: ['cust123'] }
    },
    {
      id: 'fetch_order_history',
      toolName: 'database_query',
      input: { query: 'SELECT SUM(amount) as total FROM orders WHERE customer_id = ?' }
    },
    {
      id: 'check_vip_status',
      dependsOn: ['fetch_customer', 'fetch_order_history'],
      branch: {
        type: 'if',
        // Function condition with complex logic
        condition: (ctx) => {
          const customer = ctx.results.get('fetch_customer');
          const orderHistory = ctx.results.get('fetch_order_history');

          if (!customer || !orderHistory) return false;

          const totalSpent = orderHistory.total || 0;
          const isLongTimeCustomer = (Date.now() - customer.createdAt) > (365 * 24 * 60 * 60 * 1000);
          const isHighValue = totalSpent > 10000;

          // VIP if high value OR long time customer with decent spend
          return isHighValue || (isLongTimeCustomer && totalSpent > 5000);
        },
        thenSteps: ['give_vip_treatment'],
        elseSteps: ['standard_treatment']
      }
    },
    {
      id: 'give_vip_treatment',
      toolName: 'update_customer',
      input: {
        customerId: 'cust123',
        priority: 'vip',
        discountCode: 'VIP20'
      }
    },
    {
      id: 'standard_treatment',
      toolName: 'log_info',
      input: { message: 'Standard customer treatment' }
    }
  ]
};
```

### Switch/Case

**Route based on value:**

```typescript
const workflow: WorkflowDefinition = {
  name: 'Request Type Router',
  description: 'Route requests to different handlers based on type',

  steps: [
    {
      id: 'analyze_request',
      toolName: 'llm_analyze',
      input: { prompt: (ctx) => `Analyze type of: ${ctx.userRequest}` }
    },
    {
      id: 'route_by_type',
      dependsOn: ['analyze_request'],
      branch: {
        type: 'switch',
        expression: '$results.analyze_request.requestType',
        cases: [
          {
            value: 'data_query',
            steps: ['query_database']
          },
          {
            value: 'api_call',
            steps: ['call_external_api']
          },
          {
            value: 'calculation',
            steps: ['perform_calculation']
          },
          {
            value: 'file_operation',
            steps: ['handle_file']
          }
        ],
        defaultSteps: ['handle_unknown']
      }
    },
    {
      id: 'query_database',
      toolName: 'database_query',
      input: (ctx) => ({ query: ctx.results.get('analyze_request').query })
    },
    {
      id: 'call_external_api',
      toolName: 'http_request',
      input: (ctx) => ({ url: ctx.results.get('analyze_request').apiUrl })
    },
    {
      id: 'perform_calculation',
      toolName: 'calculator',
      input: (ctx) => ({ expression: ctx.results.get('analyze_request').expression })
    },
    {
      id: 'handle_file',
      toolName: 'read_file',
      input: (ctx) => ({ path: ctx.results.get('analyze_request').filePath })
    },
    {
      id: 'handle_unknown',
      toolName: 'log_error',
      input: { message: 'Unknown request type' }
    }
  ]
};
```

### Nested Branching

**If/else within switch/case:**

```typescript
const workflow: WorkflowDefinition = {
  name: 'Complex Routing Workflow',
  description: 'Nested branching for sophisticated routing',

  steps: [
    {
      id: 'fetch_data',
      toolName: 'fetch_user_data',
      input: {}
    },
    // First level: switch on user type
    {
      id: 'route_by_type',
      dependsOn: ['fetch_data'],
      branch: {
        type: 'switch',
        expression: '$results.fetch_data.userType',
        cases: [
          {
            value: 'premium',
            steps: ['check_premium_status']
          },
          {
            value: 'basic',
            steps: ['handle_basic']
          }
        ]
      }
    },
    // Second level: if/else for premium users
    {
      id: 'check_premium_status',
      branch: {
        type: 'if',
        condition: '$results.fetch_data.premiumExpires > $results.fetch_data.now',
        thenSteps: ['give_premium_features'],
        elseSteps: ['upgrade_expired']
      }
    },
    {
      id: 'give_premium_features',
      toolName: 'enable_features',
      input: { features: ['premium_support', 'advanced_analytics', 'custom_branding'] }
    },
    {
      id: 'upgrade_expired',
      toolName: 'send_message',
      input: { message: 'Your premium subscription has expired' }
    },
    {
      id: 'handle_basic',
      toolName: 'enable_features',
      input: { features: ['basic_support'] }
    }
  ]
};
```

### Accessing Step Results

**Use the $results.stepId.field syntax to access previous step outputs:**

```typescript
// In conditions
condition: '$results.user.status == "active"'
condition: '$results.analysis.score > 50'
condition: '$results.data.items.length > 0'

// In inputs (dynamic input functions)
input: (ctx) => ({
  userId: ctx.results.get('fetch_user').id,
  email: ctx.results.get('fetch_user').email
})

// In function conditions
condition: (ctx) => {
  const user = ctx.results.get('fetch_user');
  return user && user.verified && user.status === 'active';
}

// Checking for step execution
condition: (ctx) => {
  // Check if a step has results
  return ctx.results.has('fetch_data') && ctx.results.get('fetch_data') !== null;
}

// Accessing nested fields
condition: '$results.response.data.status == "success"'
```

---

## Advanced Topics

### Dynamic Conditions

Build conditions at runtime based on external data or configuration:

```typescript
// Function conditions allow dynamic logic
const buildConditionalWorkflow = (config: any): WorkflowDefinition => {
  return {
    name: 'Dynamic Workflow',
    description: 'Conditions built from configuration',
    steps: [
      {
        id: 'fetch_config',
        toolName: 'load_config',
        input: {}
      },
      {
        id: 'check_condition',
        dependsOn: ['fetch_config'],
        branch: {
          type: 'if',
          // Build condition from config
          condition: (ctx) => {
            const configData = ctx.results.get('fetch_config');
            const userValue = ctx.results.get('analyze')?.value;

            // Apply threshold from config
            const threshold = configData.threshold || 50;
            return userValue > threshold;
          },
          thenSteps: ['execute_true_path'],
          elseSteps: ['execute_false_path']
        }
      }
    ]
  };
};
```

### Error Handling in Branches

Errors in branch evaluation are handled gracefully:

```typescript
interface ConditionalBranch {
  type: 'if';
  condition: string | ((context: WorkflowContext) => boolean);
  thenSteps: string[];
  elseSteps?: string[];  // DEFAULT: Used when condition has error
}
```

**Error handling behavior:**
- If condition evaluation throws or has syntax error → uses `elseSteps`
- If switch expression returns undefined → uses `defaultSteps`
- Errors are logged but don't break the workflow
- Workflow continues with the fallback branch

**Example:**
```typescript
branch: {
  type: 'if',
  // If $results.data doesn't exist or has no .status, error is caught
  condition: '$results.data.status == "complete"',
  thenSteps: ['success_handler'],
  elseSteps: ['error_handler']  // Executed if condition evaluates with error
}
```

### Performance Considerations

**Expression evaluation is optimized:**

1. **String expressions** are lightweight and fast
   - Simple parsing
   - No compilation
   - Good for simple conditions

2. **Function conditions** have more overhead but are still performant
   - Pre-compiled TypeScript
   - Only evaluated once per branch
   - Good for complex logic

3. **Deep equality checking** for switch cases
   - Uses recursive comparison
   - Optimized for small objects/arrays
   - For large data, use value extraction in expressions

**Performance tips:**
- Use string expressions for simple conditions (better readability)
- Use function conditions for complex logic (avoid string parsing overhead)
- Extract values before comparison in switch statements
- For large datasets, filter before checking in conditions

### Best Practices

**DO:**
- Use meaningful step IDs that describe what they do
- Keep conditions simple and readable
- Use string expressions for simple conditions
- Use function conditions for complex business logic
- Handle error cases with elseSteps
- Always provide defaultSteps for switch statements
- Test conditions with various inputs
- Document why branches are needed

**DON'T:**
- Create overly complex string expressions (move to functions)
- Mix too many conditions in a single branch
- Rely on side effects in condition functions
- Access undefined or null properties (check first)
- Create deeply nested branches (flatten if possible)
- Use branches for all routing (combine with tool logic)
- Forget to handle the default/else case

**Patterns to follow:**
```typescript
// Good: Clear, simple condition
condition: '$results.user.verified == true'

// Good: Complex logic in function
condition: (ctx) => {
  const user = ctx.results.get('user');
  return user?.verified && user.createdAt < Date.now() - WEEK;
}

// Good: Check existence before access
condition: (ctx) => ctx.results.has('user') && ctx.results.get('user').status === 'active'

// Avoid: Overly complex string expression
condition: '$results.a.b.c.d.e > 10 && $results.f.g.h != null || $results.i == undefined'

// Avoid: Side effects in condition
condition: (ctx) => {
  const user = ctx.results.get('user');
  user.lastChecked = Date.now(); // DON'T DO THIS
  return user.verified;
}
```

---

## Reference

### Expression Reference

#### Full Expression Grammar

```
expression          := logical_or

logical_or          := logical_and ("||" logical_and)*

logical_and         := logical_not ("&&" logical_not)*

logical_not         := "!" logical_not | comparison

comparison          := value (comparison_op value)?

comparison_op       := "==" | "!=" | "===" | "!==" | ">" | "<" | ">=" | "<="

value               := variable | literal | "(" expression ")"

variable            := "$" identifier ("." identifier)*

identifier          := [a-zA-Z_][a-zA-Z0-9_]*

literal             := "true" | "false" | "null" | "undefined"
                    | number | string

number              := [+-]? [0-9]+ ("." [0-9]+)?

string              := '"' [^"]* '"' | "'" [^']* "'"
```

#### Operator Precedence

1. **Parentheses** (not yet supported - split expressions instead)
2. **Logical NOT** (`!`)
3. **Comparison** (`==`, `!=`, `===`, `!==`, `>`, `<`, `>=`, `<=`)
4. **Logical AND** (`&&`)
5. **Logical OR** (`||`)

### API Reference

#### ConditionEvaluator

```typescript
class ConditionEvaluator {
  /**
   * Evaluate a condition (string expression or function)
   * @param condition String expression or function returning boolean
   * @param context Workflow context with results and errors
   * @returns ConditionResult with matched boolean and optional error
   */
  evaluate(
    condition: string | ((context: WorkflowContext) => boolean),
    context: WorkflowContext
  ): ConditionResult

  /**
   * Evaluate a value expression (for switch statements)
   * @param expression String expression or function returning any value
   * @param context Workflow context
   * @returns The evaluated value
   */
  evaluateValue(
    expression: string | ((context: WorkflowContext) => any),
    context: WorkflowContext
  ): any
}
```

#### BranchResolver

```typescript
class BranchResolver {
  /**
   * Resolve any branch type and return steps to execute
   * @param branch Branch definition (if or switch)
   * @param context Workflow context
   * @returns Array of step IDs to execute
   */
  resolve(branch: BranchDefinition, context: WorkflowContext): string[]

  /**
   * Resolve an if/else conditional branch
   * @param branch Conditional branch definition
   * @param context Workflow context
   * @returns thenSteps if condition matches, elseSteps otherwise
   */
  resolveConditional(
    branch: ConditionalBranch,
    context: WorkflowContext
  ): string[]

  /**
   * Resolve a switch branch
   * @param branch Switch branch definition
   * @param context Workflow context
   * @returns Steps from matching case or defaultSteps
   */
  resolveSwitch(
    branch: SwitchBranch,
    context: WorkflowContext
  ): string[]
}
```

#### WorkflowContext

```typescript
interface WorkflowContext {
  // User information
  userId: string;

  // Original request
  userRequest: string;

  // Step results indexed by step ID
  results: Map<string, any>;

  // Errors indexed by step ID
  errors: Map<string, Error>;

  // Workflow start time (unix timestamp)
  startTime: number;
}
```

### YAML Examples

#### Complete YAML Workflow with Branching

```yaml
name: "Complete Branching Example"
description: "Demonstrates all branching features in YAML"
maxDuration: 120000

steps:
  # Step 1: Fetch initial data
  - id: fetch_user
    toolName: database_query
    input:
      query: "SELECT * FROM users WHERE id = ?"
      params: ["user123"]

  # Step 2: Check user status (if/else)
  - id: check_active
    dependsOn: [fetch_user]
    branch:
      type: if
      condition: "$results.fetch_user.status == 'active'"
      thenSteps: [process_active]
      elseSteps: [handle_inactive]

  # Step 2a: Process active user
  - id: process_active
    toolName: send_email
    input:
      to: "$results.fetch_user.email"
      subject: "Welcome!"

  # Step 2b: Handle inactive user
  - id: handle_inactive
    toolName: send_email
    input:
      to: "$results.fetch_user.email"
      subject: "Account suspended"

  # Step 3: Fetch user plan
  - id: fetch_plan
    dependsOn: [fetch_user]
    toolName: database_query
    input:
      query: "SELECT * FROM plans WHERE user_id = ?"

  # Step 4: Route by plan type (switch/case)
  - id: route_by_plan
    dependsOn: [fetch_plan]
    branch:
      type: switch
      expression: "$results.fetch_plan.tier"
      cases:
        - value: "enterprise"
          steps: [give_enterprise]
        - value: "professional"
          steps: [give_professional]
        - value: "starter"
          steps: [give_starter]
      defaultSteps: [handle_no_plan]

  # Step 4a: Enterprise tier
  - id: give_enterprise
    toolName: enable_features
    input:
      features:
        - "api_access"
        - "custom_domain"
        - "sso"
        - "priority_support"

  # Step 4b: Professional tier
  - id: give_professional
    toolName: enable_features
    input:
      features:
        - "api_access"
        - "priority_support"

  # Step 4c: Starter tier
  - id: give_starter
    toolName: enable_features
    input:
      features:
        - "basic_api"

  # Step 4d: No plan
  - id: handle_no_plan
    toolName: log_error
    input:
      message: "User has no plan"

  # Step 5: Final notification
  - id: notify_complete
    dependsOn: [route_by_plan]
    toolName: send_notification
    input:
      userId: "user123"
      message: "Setup complete!"
```

### TypeScript Examples

#### Programmatic Workflow Building

```typescript
import { WorkflowDefinition, WorkflowStep } from '../src/core/workflow-manager';
import { ConditionalBranch, SwitchBranch } from '../src/core/workflow-conditions';

// Helper to create if/else step
const createIfElseStep = (
  id: string,
  condition: string | ((ctx: any) => boolean),
  thenSteps: string[],
  elseSteps?: string[]
): WorkflowStep => ({
  id,
  branch: {
    type: 'if',
    condition,
    thenSteps,
    elseSteps
  }
});

// Helper to create switch step
const createSwitchStep = (
  id: string,
  expression: string | ((ctx: any) => any),
  cases: { value: any; steps: string[] }[],
  defaultSteps?: string[]
): WorkflowStep => ({
  id,
  branch: {
    type: 'switch',
    expression,
    cases,
    defaultSteps
  }
});

// Build workflow programmatically
const workflow: WorkflowDefinition = {
  name: 'Programmatic Branching Workflow',
  description: 'Built with helper functions',
  steps: [
    {
      id: 'analyze',
      toolName: 'analyze_request',
      input: {}
    },
    createIfElseStep(
      'check_complexity',
      '$results.analyze.complexity > 5',
      ['handle_complex'],
      ['handle_simple']
    ),
    {
      id: 'handle_complex',
      toolName: 'complex_handler',
      input: {}
    },
    {
      id: 'handle_simple',
      toolName: 'simple_handler',
      input: {}
    },
    createSwitchStep(
      'route_by_type',
      '$results.analyze.type',
      [
        { value: 'query', steps: ['query_handler'] },
        { value: 'command', steps: ['command_handler'] }
      ],
      ['unknown_handler']
    ),
    {
      id: 'query_handler',
      toolName: 'query_tool',
      input: {}
    },
    {
      id: 'command_handler',
      toolName: 'command_tool',
      input: {}
    },
    {
      id: 'unknown_handler',
      toolName: 'log_error',
      input: {}
    }
  ]
};
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Condition always evaluates to false

**Symptoms:**
- Always takes else branch even though data looks correct
- Switch always matches default case

**Possible causes:**
- Variable path is incorrect
- Null/undefined values in path
- Type mismatch in comparison

**Solutions:**
```typescript
// Bad: May fail if user is null/undefined
condition: '$results.user.status == "active"'

// Good: Check existence first
condition: (ctx) => {
  const user = ctx.results.get('user');
  return user && user.status === 'active';
}

// Or use function condition with safe access
condition: (ctx) => ctx.results.get('user')?.status === 'active'
```

#### Issue: Expression parsing error

**Symptoms:**
- Error in logs about expression parsing
- Workflow fails or falls back to else branch

**Possible causes:**
- Unquoted string literals
- Invalid variable paths
- Missing operators

**Solutions:**
```typescript
// Bad: Unquoted string (treated as variable)
condition: '$results.user.status == active'

// Good: Quoted string
condition: '$results.user.status == "active"'

// Bad: Variable doesn't exist
condition: '$results.nonexistent.field == true'

// Good: Check in function
condition: (ctx) => ctx.results.has('data') && ctx.results.get('data').field
```

#### Issue: Switch statement not matching expected case

**Symptoms:**
- Expression evaluates but doesn't match case
- Always falls to default

**Possible causes:**
- Type mismatch (string vs number)
- Case value incorrect
- Complex value not matching exactly

**Solutions:**
```typescript
// Bad: Comparing different types
expression: '$results.id'  // Could be string "123" or number 123
cases: [
  { value: 123, steps: [...] }  // Might not match "123"
]

// Good: Ensure types match
expression: (ctx) => String(ctx.results.get('id')),  // Always string
cases: [
  { value: '123', steps: [...] }
]

// Bad: Object comparison might fail
expression: '$results.config',
cases: [
  { value: { mode: 'test' }, steps: [...] }  // Exact match required
]

// Good: Extract specific value
expression: (ctx) => ctx.results.get('config')?.mode,
cases: [
  { value: 'test', steps: [...] }
]
```

#### Issue: Accessing undefined nested properties

**Symptoms:**
- Condition evaluation silently fails
- Workflow goes to error/default path

**Solutions:**
```typescript
// Bad: Accessing deep nesting unsafely
condition: '$results.response.data.items.0.value == 10'

// Good: Safe access in function
condition: (ctx) => {
  const response = ctx.results.get('response');
  return response?.data?.items?.[0]?.value === 10;
}

// Or check step exists
condition: (ctx) => {
  if (!ctx.results.has('response')) return false;
  const data = ctx.results.get('response').data;
  return data && data.items && data.items.length > 0;
}
```

#### Issue: Branch step ID not found

**Symptoms:**
- Error about step not found
- Workflow fails

**Solutions:**
```typescript
// Bad: Typo in step ID
branch: {
  type: 'if',
  condition: '$results.fetch_user.status == "active"',
  thenSteps: ['send_emial']  // Typo: should be 'send_email'
}

// Good: Verify all step IDs exist
// Check all step IDs in thenSteps, elseSteps, and case steps exist in workflow.steps
```

#### Issue: Circular dependencies with branches

**Symptoms:**
- Error about circular dependency
- Workflow fails to start

**Solutions:**
```typescript
// Bad: Branch step creates cycle
steps: [
  { id: 'step_a', branch: { thenSteps: ['step_b'] } },
  { id: 'step_b', dependsOn: ['step_a'], branch: { thenSteps: ['step_a'] } }
]

// Good: One-way flow
steps: [
  { id: 'step_a', branch: { thenSteps: ['step_b'] } },
  { id: 'step_b', dependsOn: ['step_a'], branch: { thenSteps: ['step_c'] } },
  { id: 'step_c', toolName: 'final_step', input: {} }
]
```

### Debug Tips

**Enable detailed logging:**
```typescript
import { log } from './logger';

// Check what the condition evaluated to
condition: (ctx) => {
  const user = ctx.results.get('user');
  const result = user?.status === 'active';
  console.log('Condition result:', result, 'User:', user);
  return result;
}
```

**Validate workflow before execution:**
```typescript
const { workflowManager } = require('./workflow-manager');

const validation = workflowManager.validateWorkflow(workflow);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

**Check step results in context:**
```typescript
condition: (ctx) => {
  console.log('Available steps:', Array.from(ctx.results.keys()));
  console.log('Available errors:', Array.from(ctx.errors.keys()));
  // Rest of condition logic
}
```

**Test conditions independently:**
```typescript
import { ConditionEvaluator } from './workflow-conditions';

const evaluator = new ConditionEvaluator();
const ctx = {
  results: new Map([['fetch_user', { status: 'active' }]]),
  errors: new Map()
};

const result = evaluator.evaluate('$results.fetch_user.status == "active"', ctx);
console.log('Evaluation result:', result);
```

---

## Summary

The Workflow Conditional Branching System provides powerful, flexible routing capabilities:

- **If/Else**: Binary decisions with string expressions or function conditions
- **Switch/Case**: Multi-path routing with value matching
- **Expression Syntax**: Safe, readable condition language
- **Deep Integration**: Seamless integration with WorkflowManager
- **Error Handling**: Graceful degradation with fallback paths
- **Performance**: Optimized condition evaluation

For more information, see the complete examples in `/examples/workflows/` and the API documentation at `src/core/workflow-conditions.ts`.
