"""
智能模式检测器模块

提供智能的日常模式和专业模式检测功能
"""

from .detector import IntelligentModeDetector
from .config import ModeDetectionConfig

__all__ = [
    'IntelligentModeDetector',
    'ModeDetectionConfig'
]

__version__ = '1.0.0'
