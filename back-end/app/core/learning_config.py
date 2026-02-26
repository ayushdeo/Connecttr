import os

class LearningConfig:
    LEARNING_RATE = float(os.getenv("LEARNING_RATE", 0.01))
    MIN_WEIGHT = 0.05
    MAX_WEIGHT = 0.90
    LEARN_MIN_EVENTS = int(os.getenv("LEARN_MIN_EVENTS", 30))
