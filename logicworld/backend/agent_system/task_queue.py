from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Task:
    id: int
    description: str
    status: str = "pending"  # pending, in_progress, completed, failed
    result: Optional[str] = None

class TaskQueue:
    """A very simple FIFO task queue for orchestration."""

    def __init__(self):
        self._tasks: List[Task] = []
        self._next_id = 1

    def add_task(self, description: str) -> Task:
        task = Task(id=self._next_id, description=description)
        self._tasks.append(task)
        self._next_id += 1
        return task

    def get_next_task(self) -> Optional[Task]:
        for task in self._tasks:
            if task.status == "pending":
                task.status = "in_progress"
                return task
        return None

    def mark_completed(self, task_id: int, result: str):
        for task in self._tasks:
            if task.id == task_id:
                task.status = "completed"
                task.result = result
                return

    def all_completed(self) -> bool:
        return all(t.status == "completed" for t in self._tasks)

    def as_dict(self):
        return [task.__dict__ for task in self._tasks] 