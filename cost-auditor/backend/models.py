"""
Database models for Cost Auditor
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class CostRecord(Base):
    """Historical cost records"""
    __tablename__ = 'cost_records'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service = Column(String(50), index=True)  # anthropic, gcp, elevenlabs, etc
    category = Column(String(50))  # compute, storage, api_calls, etc
    amount = Column(Float)  # Cost in USD
    usage_details = Column(JSON)  # Details about usage
    project = Column(String(100), nullable=True)
    user_id = Column(String(100), nullable=True)

class BudgetLimit(Base):
    """Budget limits by service"""
    __tablename__ = 'budget_limits'

    id = Column(Integer, primary_key=True)
    service = Column(String(50), unique=True, index=True)
    monthly_limit = Column(Float)  # USD per month
    alert_threshold = Column(Float, default=0.8)  # Alert at 80%
    hard_limit = Column(Float, nullable=True)  # Auto-disable at this amount
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

class Alert(Base):
    """Cost alerts log"""
    __tablename__ = 'alerts'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service = Column(String(50))
    alert_type = Column(String(50))  # threshold, spike, projection, anomaly
    severity = Column(String(20))  # info, warning, critical
    message = Column(String(500))
    current_cost = Column(Float)
    limit = Column(Float, nullable=True)
    notified = Column(Integer, default=0)  # Boolean for notification sent

class UsageMetric(Base):
    """Detailed usage metrics"""
    __tablename__ = 'usage_metrics'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    service = Column(String(50), index=True)
    metric_name = Column(String(100))  # tokens, requests, compute_minutes, etc
    metric_value = Column(Float)
    cost_per_unit = Column(Float, nullable=True)
    metadata = Column(JSON)

class Optimization(Base):
    """Optimization suggestions"""
    __tablename__ = 'optimizations'

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    service = Column(String(50))
    category = Column(String(50))  # model_selection, caching, batching, etc
    suggestion = Column(String(500))
    potential_savings = Column(Float)  # USD per month
    confidence = Column(Float)  # 0.0 to 1.0
    status = Column(String(20), default='pending')  # pending, applied, dismissed
    applied_at = Column(DateTime, nullable=True)

# Database setup
def init_db(db_path='sqlite:////data/cost_auditor.db'):
    """Initialize database"""
    engine = create_engine(db_path, echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()

# Create session
session = init_db()
