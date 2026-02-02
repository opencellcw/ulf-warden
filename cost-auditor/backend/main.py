"""
Cost Auditor - Main FastAPI Application
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Dict, List
import asyncio

from models import session, CostRecord, BudgetLimit, Alert, UsageMetric, Optimization
from collectors.anthropic_collector import AnthropicCollector
from collectors.replicate_collector import ReplicateCollector
from collectors.elevenlabs_collector import ElevenLabsCollector
from collectors.openai_collector import OpenAICollector
from collectors.gcp_collector import GCPCollector

app = FastAPI(title="Cost Auditor", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Collectors
collectors = {
    'anthropic': AnthropicCollector(),
    'replicate': ReplicateCollector(),
    'elevenlabs': ElevenLabsCollector(),
    'openai': OpenAICollector(),
    'gcp': GCPCollector()
}

@app.get("/")
def root():
    return {
        "service": "Cost Auditor",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============================================================================
# Current Costs
# ============================================================================

@app.get("/costs/current")
def get_current_costs():
    """Get current costs across all services"""
    costs = {}
    total = 0.0

    for service_name, collector in collectors.items():
        try:
            cost = collector.get_current_month_cost()
            costs[service_name] = cost
            total += cost
        except Exception as e:
            costs[service_name] = {'error': str(e)}

    return {
        'total': total,
        'by_service': costs,
        'currency': 'USD',
        'period': 'current_month',
        'timestamp': datetime.now().isoformat()
    }

@app.get("/costs/service/{service_name}")
def get_service_cost(service_name: str):
    """Get detailed cost for a specific service"""
    if service_name not in collectors:
        raise HTTPException(status_code=404, detail=f"Service {service_name} not found")

    collector = collectors[service_name]
    try:
        data = collector.get_usage()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Budgets & Limits
# ============================================================================

@app.get("/budgets")
def get_budgets():
    """Get all budget limits"""
    budgets = session.query(BudgetLimit).all()
    return [{
        'service': b.service,
        'monthly_limit': b.monthly_limit,
        'alert_threshold': b.alert_threshold,
        'hard_limit': b.hard_limit
    } for b in budgets]

@app.post("/budgets")
def create_budget(service: str, monthly_limit: float, alert_threshold: float = 0.8, hard_limit: float = None):
    """Create or update budget limit for a service"""
    budget = session.query(BudgetLimit).filter_by(service=service).first()

    if budget:
        budget.monthly_limit = monthly_limit
        budget.alert_threshold = alert_threshold
        budget.hard_limit = hard_limit
        budget.updated_at = datetime.now()
    else:
        budget = BudgetLimit(
            service=service,
            monthly_limit=monthly_limit,
            alert_threshold=alert_threshold,
            hard_limit=hard_limit
        )
        session.add(budget)

    session.commit()
    return {"message": "Budget updated", "service": service}

@app.get("/budgets/status")
def get_budget_status():
    """Get budget status for all services"""
    budgets = session.query(BudgetLimit).all()
    status = []

    for budget in budgets:
        current_cost = collectors[budget.service].get_current_month_cost()
        percent_used = (current_cost / budget.monthly_limit * 100) if budget.monthly_limit > 0 else 0

        alert_level = "ok"
        if percent_used >= 100:
            alert_level = "critical"
        elif percent_used >= budget.alert_threshold * 100:
            alert_level = "warning"

        status.append({
            'service': budget.service,
            'current_cost': current_cost,
            'monthly_limit': budget.monthly_limit,
            'percent_used': percent_used,
            'alert_level': alert_level,
            'remaining': budget.monthly_limit - current_cost
        })

    return status

# ============================================================================
# Alerts
# ============================================================================

@app.get("/alerts")
def get_alerts(limit: int = 50):
    """Get recent alerts"""
    alerts = session.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
    return [{
        'id': a.id,
        'timestamp': a.timestamp.isoformat(),
        'service': a.service,
        'alert_type': a.alert_type,
        'severity': a.severity,
        'message': a.message,
        'current_cost': a.current_cost
    } for a in alerts]

@app.post("/alerts/check")
async def check_alerts(background_tasks: BackgroundTasks):
    """Check all services for alert conditions"""
    background_tasks.add_task(run_alert_check)
    return {"message": "Alert check scheduled"}

def run_alert_check():
    """Run alert check for all services"""
    budgets = session.query(BudgetLimit).all()

    for budget in budgets:
        try:
            current_cost = collectors[budget.service].get_current_month_cost()
            percent_used = (current_cost / budget.monthly_limit) if budget.monthly_limit > 0 else 0

            # Threshold alert
            if percent_used >= budget.alert_threshold:
                create_alert(
                    service=budget.service,
                    alert_type='threshold',
                    severity='warning' if percent_used < 1.0 else 'critical',
                    message=f'{budget.service} has reached {percent_used*100:.1f}% of monthly budget',
                    current_cost=current_cost,
                    limit=budget.monthly_limit
                )

            # Hard limit
            if budget.hard_limit and current_cost >= budget.hard_limit:
                create_alert(
                    service=budget.service,
                    alert_type='hard_limit',
                    severity='critical',
                    message=f'{budget.service} has exceeded hard limit!',
                    current_cost=current_cost,
                    limit=budget.hard_limit
                )
                # TODO: Disable API access

        except Exception as e:
            print(f"Error checking alerts for {budget.service}: {e}")

def create_alert(service: str, alert_type: str, severity: str, message: str, current_cost: float, limit: float = None):
    """Create a new alert"""
    alert = Alert(
        service=service,
        alert_type=alert_type,
        severity=severity,
        message=message,
        current_cost=current_cost,
        limit=limit
    )
    session.add(alert)
    session.commit()

    # TODO: Send notification via Slack/Discord

# ============================================================================
# Projections
# ============================================================================

@app.get("/projections/end-of-month")
def get_projections():
    """Project costs to end of month"""
    projections = {}

    for service_name, collector in collectors.items():
        try:
            projection = collector.project_end_of_month()
            projections[service_name] = projection
        except:
            projections[service_name] = {'error': 'Unable to project'}

    return projections

# ============================================================================
# Optimizations
# ============================================================================

@app.get("/optimizations")
def get_optimizations():
    """Get optimization suggestions"""
    opts = session.query(Optimization).filter_by(status='pending').order_by(Optimization.potential_savings.desc()).all()
    return [{
        'id': o.id,
        'service': o.service,
        'category': o.category,
        'suggestion': o.suggestion,
        'potential_savings': o.potential_savings,
        'confidence': o.confidence
    } for o in opts]

@app.post("/optimizations/{opt_id}/apply")
def apply_optimization(opt_id: int):
    """Mark optimization as applied"""
    opt = session.query(Optimization).filter_by(id=opt_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Optimization not found")

    opt.status = 'applied'
    opt.applied_at = datetime.now()
    session.commit()

    return {"message": "Optimization marked as applied"}

# ============================================================================
# Historical Data
# ============================================================================

@app.get("/history")
def get_history(service: str = None, days: int = 30):
    """Get historical cost data"""
    start_date = datetime.now() - timedelta(days=days)

    query = session.query(CostRecord).filter(CostRecord.timestamp >= start_date)

    if service:
        query = query.filter(CostRecord.service == service)

    records = query.order_by(CostRecord.timestamp).all()

    return [{
        'timestamp': r.timestamp.isoformat(),
        'service': r.service,
        'amount': r.amount,
        'category': r.category
    } for r in records]

# ============================================================================
# Scheduled Jobs
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize scheduled jobs"""
    # TODO: Use APScheduler for:
    # - Hourly cost collection
    # - Daily alerts check
    # - Weekly optimization analysis
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
