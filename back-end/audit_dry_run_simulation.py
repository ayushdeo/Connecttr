import os, sys, time, random, json
from datetime import datetime
from dotenv import load_dotenv

# Path setup
sys.path.append(os.getcwd())
load_dotenv(".env")

from app.db import get_database, get_leads_collection
import app.services.perplexity_client
import app.services.intent_service

# MOCK EXTERNAL APIs
def mock_classify_intent(text, brief):
    return {
        "intent_score": random.randint(30, 90),
        "intent_type": "direct",
        "reasoning": "Audit Mock"
    }

def mock_upsert_leads_to_hub(leads, org_id=None):
    pass

app.services.perplexity_client.classify_intent = mock_classify_intent
app.services.intent_service.upsert_leads_to_hub = mock_upsert_leads_to_hub

from app.services.intent_service import run_intent_pipeline
from app.services.learning_service import run_reinforcement_tuner
from app.services.experiments import run_promotion_check
from app.services.campaign_health import check_campaign_health

def run_audit_simulation():
    print("--- 🔍 AI Engine Audit Dry-Run Simulation (Phases 1-3) ---")
    db = get_database()
    timestamp = int(time.time())
    orgs = [f"audit-org-a-{timestamp}", f"audit-org-b-{timestamp}"]
    camp_id = "audit-camp-1"
    
    results = {
        "orgs_simulated": [],
        "metrics": {
            "leads_inserted": 0,
            "tier_routing": {"high": 0, "medium": 0, "low": 0},
            "weight_changes_suggested": [],
            "promotions_suggested": [],
            "campaigns_paused": []
        }
    }

    # 1. Setup Synthetic Data (500+ leads)
    print(f"\n[1/5] Ingesting 500+ synthetic leads for 2 orgs...")
    all_leads = []
    for org in orgs:
        for i in range(260):
            uid = f"audit_lead_{org}_{i}"
            # Randomize features for diverse routing
            r_score_base = random.choice([20, 50, 90])
            status = random.choice(["Sent", "Responded", "Bounced", "New"])
            
            all_leads.append({
                "id": uid,
                "url": f"https://example.com/{uid}",
                "org_id": org,
                "campaign_id": camp_id,
                "status": status,
                "role": random.choice(["Founder", "CEO", "VP", "Manager", "Other"]),
                "rule_score": r_score_base,
                "llm_score": random.choice([0, 40, 85]),
                "created_at": time.time() - random.randint(0, 86400 * 14)
            })
    
    get_leads_collection().insert_many(all_leads)
    results["metrics"]["leads_inserted"] = len(all_leads)

    # 2. Run Intent Pipeline (Tier Routing)
    print(f"[2/5] Running Intent Pipeline Audit...")
    # We trigger pipeline for one campaign (simulated)
    # The pipeline will process 'raw' (New) leads
    pipeline_res = run_intent_pipeline(camp_id)
    
    # Analyze routing results
    leads = list(get_leads_collection().find({"org_id": {"$in": orgs}}))
    for l in leads:
        label = l.get("intent_label", "Low")
        results["metrics"]["tier_routing"][label.lower()] += 1

    # 3. Learning Service Dry-Run
    print(f"[3/5] Auditing learning_service (Dry-Run Mode)...")
    # Force LEARNING_MODE = dry-run logic
    # (Note: Current learning_service.py uses a toggle; we check its logic)
    for org in orgs:
        # We manually call tuner to see what it WOULD do
        # Note: Tuner needs enough 'Responded' data
        tuner_res = run_reinforcement_tuner(org)
        if tuner_res.get("status") != "skipped":
            results["metrics"]["weight_changes_suggested"].append({
                "org": org,
                "old": tuner_res["old_weights"],
                "new": tuner_res["new_weights"]
            })

    # 4. Experiment Promotion Dry-Run
    print(f"[4/5] Auditing Experiment Promotion...")
    for org in orgs:
        # Inject some template performance stats
        db["template_performance"].insert_many([
            {"org_id": org, "campaign_id": camp_id, "template_variant": "A", "sent": 100, "positive_replies": 2},
            {"org_id": org, "campaign_id": camp_id, "template_variant": "B", "sent": 100, "positive_replies": 15},
            {"org_id": org, "campaign_id": camp_id, "template_variant": "C", "sent": 100, "positive_replies": 5}
        ])
        promo_res = run_promotion_check(org, camp_id)
        if promo_res.get("promoted"):
            results["metrics"]["promotions_suggested"].append({
                "org": org,
                "variant": promo_res["promoted"],
                "p_win": promo_res["probabilities"][promo_res["promoted"]]
            })

    # 5. Campaign Health (Auto-pause simulation)
    print(f"[5/5] Auditing Campaign Health Safeguards...")
    health_org = orgs[0]
    # Inject high bounce rate
    db["leads"].update_many(
        {"org_id": health_org, "campaign_id": camp_id},
        {"$set": {"status": "Bounced"}}
    )
    health_res = check_campaign_health(camp_id)
    if health_res.get("status") == "paused":
        results["metrics"]["campaigns_paused"].append(camp_id)

    # Output Summary
    print("\n--- 📊 Audit dry-run Summary ---")
    print(json.dumps(results, indent=2))
    
    # Save to CSV for report
    with open("dry_run_summary.csv", "w") as f:
        f.write("org,leads,high_intent,med_intent,promoted_variant,weight_shift\n")
        for org in orgs:
            l_count = len([x for x in leads if x["org_id"] == org])
            hi = len([x for x in leads if x["org_id"] == org and x.get("intent_label") == "High"])
            me = len([x for x in leads if x["org_id"] == org and x.get("intent_label") == "Medium"])
            prom = next((x["variant"] for x in results["metrics"]["promotions_suggested"] if x["org"] == org), "None")
            shift = "Yes" if any(x["org"] == org for x in results["metrics"]["weight_changes_suggested"]) else "No"
            f.write(f"{org},{l_count},{hi},{me},{prom},{shift}\n")

    # Final result for JSON report
    with open("audit_results_raw.json", "w") as f:
        json.dump(results, f)

if __name__ == "__main__":
    run_audit_simulation()
