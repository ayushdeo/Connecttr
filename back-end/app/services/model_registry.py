class ModelRegistry:
    def __init__(self, db):
        self.db = db

    def get_weights(self, org_id):
        record = self.db.model_registry.find_one({"org_id": org_id})
        if record and "weights" in record:
            return record["weights"]

        return {
            "W_RULE": 0.3,
            "W_LLM": 0.5,
            "W_ENGAGEMENT": 0.2
        }

    def update_weights(self, org_id, weights):
        self.db.model_registry.update_one(
            {"org_id": org_id},
            {"$set": {"weights": weights}},
            upsert=True
        )
