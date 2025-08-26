import logging
from typing import List, Dict, Any
from .task_queue import TaskQueue
from .execution_engine import ExecutionEngine

class Orchestrator:
    """
    简化的编排器
    管理任务队列，使用统一的执行逻辑
    """

    def __init__(self):
        self.queue = TaskQueue()
        self.engine = ExecutionEngine()
        logging.info("[编排器] 已初始化")

    async def run(self, initial_tasks: List[str]) -> Dict[str, Any]:
        """根据初始任务列表，执行完整的工作流"""
        # 1. 填充任务队列
        for desc in initial_tasks:
            self.queue.add_task(desc)

        context_accumulator = ""
        logs = []

        # 2. 循环处理任务，直到队列完成
        while not self.queue.all_completed():
            task = self.queue.get_next_task()
            if not task:
                break  # 没有待处理的任务

            # 推断角色
            role = self._infer_role_from_task(task.description)
            
            # 3. 调用执行引擎处理单个任务
            result = await self.engine.execute(
                task_description=task.description,
                context=context_accumulator,
                role=role
            )
            
            # 4. 更新任务状态和上下文
            self.queue.mark_completed(task.id, result['result'])
            context_accumulator += f"\n\n## 任务 {task.id} ({task.description}) 的思考过程:\n{result['result']}"
            logs.append(result)

        logging.info("[编排器] 所有任务已完成")
        return {
            "summary": context_accumulator,
            "tasks": self.queue.as_dict(),
            "logs": logs,
        }

    @staticmethod
    def _infer_role_from_task(description: str) -> str:
        """根据任务描述推断所需的专家角色"""
        desc = description.lower()
        if any(k in desc for k in ["需求", "功能", "prd", "用户故事"]):
            return "product_manager"
        if any(k in desc for k in ["设计", "架构", "技术选型", "database"]):
            return "architect"
        if any(k in desc for k in ["测试", "qa", "质量保证", "test case"]):
            return "qa"
        # 默认返回助手
        return "assistant" 