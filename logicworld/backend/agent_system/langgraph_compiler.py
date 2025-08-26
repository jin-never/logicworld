"""LangGraph workflow compiler：将前端传来的节点+边编译为 StateGraph，并可直接执行。\n目前仅支持 nodeType: tool-node, end-topic-node。"""

from typing import List, Dict, Any, Callable, Awaitable
import logging

try:
    from langgraph.graph import StateGraph
    from typing import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from tools import tool_registry
from .agent_factory import AgentFactory

# Node / Edge schema 从单独的文件导入，避免循环导入
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from utils.schemas import Node, Edge


def _resolve_param(value: Any, context: Dict[str, Any]):
    """解析参数中对上文引用的占位符（格式 @nodeId.outputName）"""
    if isinstance(value, str) and value.startswith("@"):
        ref = value[1:]
        return context.get(ref)
    return value


def _make_tool_node_runner(node: Node, progress_cb: Callable[[Dict[str, Any]], Awaitable[None]]):
    tool_name = node.data.params.get("tool_name") or node.data.params.get("tool")
    if not tool_name:
        raise ValueError(f"tool-node {node.id} 缺少 tool_name 参数")

    async def _runner(state: Dict[str, Any]):
        await progress_cb({"event": "node_start", "node_id": node.id})
        context = state.setdefault("context", {})
        raw_params = {k: v for k, v in node.data.params.items() if k != "tool_name" and k != "tool"}
        resolved_params = {k: _resolve_param(v, context) for k, v in raw_params.items()}
        result = await tool_registry.execute_tool(tool_name, **resolved_params)
        if node.data.outputs:
            context_key = f"{node.id}.{node.data.outputs[0]}"
            context[context_key] = result
        await progress_cb({"event": "node_done", "node_id": node.id})
        return state

    return _runner


def _make_end_topic_runner(node: Node, progress_cb: Callable[[Dict[str, Any]], Awaitable[None]]):
    async def _runner(state: Dict[str, Any]):
        await progress_cb({"event": "node_start", "node_id": node.id})
        context = state.get("context", {})
        prompt_template = node.data.params.get("prompt") or "请总结以上结果。"
        # 简单替换 @{ref}
        import re
        def sub(match):
            ref = match.group(1)
            return str(context.get(ref, ""))
        hydrated_prompt = re.sub(r"@\{([^}]+)\}", sub, prompt_template)
        summary = await AgentFactory.ask_llm(hydrated_prompt)
        if node.data.outputs:
            context[f"{node.id}.{node.data.outputs[0]}"] = summary
        state["final_result"] = summary
        await progress_cb({"event": "node_done", "node_id": node.id})
        return state

    return _runner


def compile_graph(nodes: List[Node], edges: List[Edge], progress_cb: Callable[[Dict[str, Any]], Awaitable[None]]):
    if not LANGGRAPH_AVAILABLE:
        raise RuntimeError("langgraph 未安装，无法编译工作流。")

    # 定义状态结构
    class WorkflowState(TypedDict):
        context: Dict[str, Any]
        final_result: str

    g = StateGraph(WorkflowState)
    node_map = {n.id: n for n in nodes}

    for n in nodes:
        if n.data.nodeType == "tool-node":
            runner = _make_tool_node_runner(n, progress_cb)
        elif n.data.nodeType == "end-topic-node":
            runner = _make_end_topic_runner(n, progress_cb)
        else:
            # 其他类型暂不支持，直接跳过并原样返回 state
            def _noop(state):
                return state
            runner = _noop
        g.add_node(n.id, runner)

    # 添加边
    for e in edges:
        if e.source in node_map and e.target in node_map:
            g.add_edge(e.source, e.target)

    # 找到入度为 0 的节点作为入口
    in_deg = {n.id: 0 for n in nodes}
    for e in edges:
        if e.target in in_deg:
            in_deg[e.target] += 1
    starts = [nid for nid, deg in in_deg.items() if deg == 0]
    if not starts:
        raise ValueError("工作流存在循环，无法确定入口节点。")
    entry = starts[0]
    g.set_entry_point(entry)

    workflow = g.compile()
    return workflow


async def run_langgraph_workflow(nodes: List[Node], edges: List[Edge], progress_cb: Callable[[Dict[str, Any]], Awaitable[None]]):
    """编译并运行工作流，返回最终结果字典。"""
    workflow = compile_graph(nodes, edges, progress_cb)
    state = {"context": {}}
    async for event in workflow.astream(state):
        # summary 节点会把 final_result 写入 state
        pass
    return {
        "status": "success",
        "result": state.get("final_result"),
        "context": state.get("context"),
    } 