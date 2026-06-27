import hashlib
import json
import logging
from datetime import datetime, timezone
from app.core.firebase_config import db

logger = logging.getLogger("netra.audit")
logger.setLevel(logging.INFO)

class AuditService:
    @staticmethod
    def log_event(operator_uid: str, operator_email: str, action: str, details: str, ip_address: str):
        """
        Permanently writes an event to the audit ledger in Firestore.
        Maintains sequential hashing (blockchain-like chain) to detect alteration.
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # 1. Fetch the latest audit log entry to get the preceding hash
            audit_ref = db.collection("audit_logs")
            latest_query = audit_ref.order_by("timestamp", direction="DESCENDING").limit(1).get()
            
            previous_hash = "0" * 64  # Genesis block hash
            if latest_query:
                previous_hash = latest_query[0].to_dict().get("entry_hash", "0" * 64)
                
            # 2. Compute current block payload
            payload = {
                "timestamp": timestamp,
                "operator_uid": operator_uid,
                "operator_email": operator_email,
                "action": action,
                "details": details,
                "ip_address": ip_address,
                "previous_hash": previous_hash
            }
            
            # Serialize payload details sorted to ensure determinism
            serialized_payload = f"{timestamp}|{operator_uid}|{operator_email}|{action}|{details}|{ip_address}|{previous_hash}"
            entry_hash = hashlib.sha256(serialized_payload.encode('utf-8')).hexdigest()
            
            # Add hash to payload
            payload["entry_hash"] = entry_hash
            
            # 3. Save to database
            db.collection("audit_logs").add(payload)
            logger.info(f"Audit log saved: {action} by {operator_email} (Hash: {entry_hash[:10]}...)")
            return entry_hash
        except Exception as e:
            logger.error(f"Audit logging failed: {e}")
            # Ensure the operation doesn't crash, but critical alerts are raised in production
            return None
            
    @staticmethod
    def verify_ledger() -> bool:
        """
        Verifies the integrity of the entire audit trail by recalculating hashes sequentially.
        Returns True if ledger is sound, False if any tampering/deletion is detected.
        """
        try:
            logs = db.collection("audit_logs").order_by("timestamp", direction="ASCENDING").get()
            expected_prev_hash = "0" * 64
            
            for log_snap in logs:
                log = log_snap.to_dict()
                timestamp = log.get("timestamp")
                op_uid = log.get("operator_uid")
                op_email = log.get("operator_email")
                action = log.get("action")
                details = log.get("details")
                ip = log.get("ip_address")
                prev_hash = log.get("previous_hash")
                stored_hash = log.get("entry_hash")
                
                # Check previous hash connection
                if prev_hash != expected_prev_hash:
                    logger.critical(f"Ledger Corrupted! Expected previous hash {expected_prev_hash[:10]}..., got {prev_hash[:10]}... on log {log_snap.id}")
                    return False
                
                # Recalculate hash
                recalc_payload = f"{timestamp}|{op_uid}|{op_email}|{action}|{details}|{ip}|{prev_hash}"
                recalc_hash = hashlib.sha256(recalc_payload.encode('utf-8')).hexdigest()
                
                if recalc_hash != stored_hash:
                    logger.critical(f"Ledger Tampered! Recalculated hash {recalc_hash[:10]}... does not match stored hash {stored_hash[:10]}... on log {log_snap.id}")
                    return False
                    
                expected_prev_hash = stored_hash
                
            return True
        except Exception as e:
            logger.error(f"Ledger verification failed: {e}")
            return False
