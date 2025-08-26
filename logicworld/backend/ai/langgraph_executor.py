from __future__ import annotations

"""LangGraph based workflow executor (minimal integration).

当前版本仅将 Clarify 阶段与原有 `execute_workflow_logic` 打包成两级节点，
并通过 `StateGraph` 暴露流式事件接口，方便后续逐步细化。
"""

import asyncio
import json
import logging
from typing import Any, TypedDict, Callable, Awaitable

from langgraph.graph import StateGraph, END, State

from prompt_lib import render_prompt
from agent_system.agent_factory import AgentFactory
from main import execute_workflow_logic, Node, Edge, WorkflowPayload  # type: ignore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------


class WFState(TypedDict, total=False):
    """State shared across LangGraph nodes."""

    payload: WorkflowPayload
    need_clarify: bool
    questions: list[str]
    context: dict[str, Any]
    result: Any


# ---------------------------------------------------------------------------
# LangGraph nodes
# ---------------------------------------------------------------------------


async def clarify_node(state: WFState) -> WFState:  # noqa: D401
    """Ask LLM to generate clarifying questions. May set need_clarify flag."""

    payload: WorkflowPayload = state["payload"]

    try:
        clarify_prompt = render_prompt(
            "clarify_requirements",
            user_input=json.dumps([n.data.label for n in payload.nodes], ensure_ascii=False),
        )
        clarify_resp = await AgentFactory.ask_llm(clarify_prompt)

        questions: list[str] = []
        try:
            questions = json.loads(clarify_resp)
            if not isinstance(questions, list):
                questions = []
        except Exception:  # noqa: BLE001
            # fallback: split by lines / numbering
            for line in clarify_resp.splitlines():
                clean = line.strip("- •0123456789. ")
                if clean:
                    questions.append(clean)

        questions = [q for q in questions if q]
        if questions:
            state["need_clarify"] = True
            state["questions"] = questions
        else:
            state["need_clarify"] = False
    except Exception as e:  # noqa: BLE001
        logger.warning("Clarify phase error: %s", e)
        state["need_clarify"] = False

    return state


async def run_workflow_node(state: WFState) -> WFState:
    """Run the original execute_workflow_logic and save result."""

    payload: WorkflowPayload = state["payload"]
    result = await execute_workflow_logic(payload.nodes, {}, payload)  # context handled inside
    state["result"] = result
    return state


# ---------------------------------------------------------------------------
# Dynamic graph builder (per-payload)
# ---------------------------------------------------------------------------

from functools import partial


def _make_node_executor(node_id: str, node_map: dict[str, Node]) -> Callable[[WFState], Awaitable[WFState]]:
    """Generate an async executor function for a single workflow node."""

    async def _exec(state: WFState) -> WFState:  # noqa: D401
        payload: WorkflowPayload = state["payload"]
        context = state.get("context", {})
        # Use original helper to run just this node
        try:
            single_node = node_map[node_id]
            result = await execute_workflow_logic([single_node], context, payload)
            # If result is dict and has context, merge back
            if isinstance(result, dict):
                context.update(result.get("context", {}))
                # capture final result when status==success and "result" in dict
                if result.get("status") == "success" and "result" in result:
                    state["result"] = result["result"]
            state["context"] = context
        except Exception as exc:  # noqa: BLE001
            logger.error("Error executing node %s: %s", node_id, exc)
            state["error"] = {
                "node_id": node_id,
                "message": str(exc),
            }
        return state

    _exec.__name__ = f"run_{node_id}"  # pretty name for debug
    return _exec


def build_graph(payload: WorkflowPayload) -> StateGraph:  # type: ignore[valid-type]
    """Compile a StateGraph tailored to this workflow payload."""

    sg: StateGraph = StateGraph(WFState)  # type: ignore[arg-type]

    # --- Clarify node ---
    sg.add_node("clarify", clarify_node)

    # Dummy start node (does nothing)
    async def _start_pass(state: WFState) -> WFState:
        return state

    sg.add_node("start", _start_pass)

    # Build node executors
    node_map = {n.id: n for n in payload.nodes}
    for n in payload.nodes:
        sg.add_node(n.id, _make_node_executor(n.id, node_map))

    # --- Entry & conditional from clarify ---
    def clarify_branch(state: WFState) -> str:
        return "end" if state.get("need_clarify") else "start"

    sg.set_entry_point("clarify")
    sg.add_conditional_edges("clarify", clarify_branch, {
        "start": "start",
        "end": END,
    })

    # Edge: start → all root nodes (in-degree 0)
    incoming = {n.id: 0 for n in payload.nodes}
    for e in payload.edges:
        if e.target in incoming:
            incoming[e.target] += 1
    root_nodes = [nid for nid, deg in incoming.items() if deg == 0]
    for rid in root_nodes:
        sg.add_edge("start", rid)

    # Add edges according to payload graph
    for e in payload.edges:
        if e.source in node_map and e.target in node_map:
            sg.add_edge(e.source, e.target)

    # End condition: if a node writes state["result"], treat as final output; but
    # we still need explicit END nodes. We'll just let graph naturally end when
    # no outgoing edges. LangGraph will auto route to END when node has no edge.

    return sg.compile()


# ---------------------------------------------------------------------------
# Public helpers (dynamic compile each call)
# ---------------------------------------------------------------------------


async def invoke(payload: WorkflowPayload) -> WFState:  # noqa: D401
    """Run workflow once and return final state."""

    graph = build_graph(payload)
    return await graph.invoke({"payload": payload, "context": {}})


async def stream_events(payload: WorkflowPayload):  # noqa: D401
    """Stream LangGraph events for the given payload."""

    graph = build_graph(payload)
    async for ev in graph.astream_events({"payload": payload, "context": {}}, version="v2"):
        yield ev 