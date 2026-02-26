from app.core.learning_config import LearningConfig

def test_config_values():
    assert LearningConfig.LEARNING_RATE >= 0
    assert LearningConfig.MIN_WEIGHT == 0.05
    assert LearningConfig.MAX_WEIGHT == 0.90
    assert LearningConfig.LEARN_MIN_EVENTS >= 0
    
def test_boundaries_in_clamping():
    def clamp(val, min_val, max_val):
        return max(min_val, min(max_val, val))
    
    assert clamp(1.5, 0.05, 0.90) == 0.90
    assert clamp(0.01, 0.05, 0.90) == 0.05
    assert clamp(0.5, 0.05, 0.90) == 0.5
