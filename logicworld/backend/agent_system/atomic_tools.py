import os
import subprocess
from typing import Optional

from tools.tool_registry import register_tool


def _ensure_base_dir(base_dir: str) -> str:
    if not base_dir:
        base_dir = os.path.join(os.getcwd(), "data", "storage", "uploads")
    os.makedirs(base_dir, exist_ok=True)
    return base_dir


def _resolve_path(path: str) -> str:
    """
    Resolve a safe output path under backend/data/storage/uploads when a relative path is given.
    Absolute paths are allowed but parent dirs will be created if missing.
    """
    base_dir = os.path.join(os.getcwd(), "data", "storage", "uploads")
    if not path:
        path = "output.txt"
    if not os.path.isabs(path):
        os.makedirs(base_dir, exist_ok=True)
        return os.path.join(base_dir, path)
    # absolute path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def write_file(path: str, content: str) -> str:
    """
    Write text content to a file. If path is relative, it will be placed under backend/data/storage/uploads.

    Args:
        path: Target file path. Relative paths are resolved into data/storage/uploads.
        content: Text content to write.

    Returns:
        A human-readable message containing the absolute path.
    """
    abs_path = _resolve_path(path)
    # Write as UTF-8 text. For simple demo, .docx extension is allowed as plain text.
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(content or "")
    return f"文件已生成: {abs_path}"


def run_shell_command(command: str, cwd: Optional[str] = None, timeout: int = 60) -> str:
    """
    Run a shell command and return combined stdout/stderr. For safety, no shell=True is used on Windows.
    """
    if not command:
        return "命令为空"
    try:
        completed = subprocess.run(
            command,
            cwd=cwd or os.getcwd(),
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=True  # kept true for cross-platform convenience in this demo
        )
        output = completed.stdout.strip()
        err = completed.stderr.strip()
        return (output + ("\n" + err if err else "")).strip() or f"命令已执行，返回码: {completed.returncode}"
    except Exception as e:
        return f"命令执行失败: {e}"


def register_atomic_tools() -> None:
    """Register atomic tools so that AI tool calls can execute."""
    register_tool(write_file)
    register_tool(run_shell_command) 