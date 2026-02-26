from app.services.model_registry import ModelRegistry

class MockDB:
    class _registry:
        def find_one(self, query):
            return None
    def __init__(self):
        self.model_registry = self._registry()

def test_registry_fallback_works():
    db = MockDB()
    registry = ModelRegistry(db)
    weights = registry.get_weights("fake_org")
    
    assert weights["W_RULE"] == 0.3
    assert weights["W_LLM"] == 0.5
    assert weights["W_ENGAGEMENT"] == 0.2
