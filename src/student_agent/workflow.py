from __future__ import annotations

from typing import Any

from .agents import (
    CaseContext,
    CoordinatorRouter,
    OrderItemAgent,
    PaymentAgent,
    PolicyAgent,
    ShipmentAgent,
    VerifierAgent,
)
from .mcp_gateway import EvidenceGateway
from .trace import TraceWriter


async def solve_case(
    case: dict[str, Any], gateway: EvidenceGateway, trace: TraceWriter
) -> dict[str, Any]:
    """Execute the multi-agent investigation workflow for a single dispute case.

    Follows the A2A architecture:
    Coordinator -> Specialists (Order/Item, Shipment, Payment) -> Policy Agent -> Verifier Agent.
    """
    case_id = case["case_id"]

    # 1. Initialize shared investigation context
    ctx = CaseContext(
        case_id=case_id,
        case=case,
        gateway=gateway,
        trace=trace,
        contracts=trace.contracts,
    )

    # 2. Coordinator & Entity Resolution
    await CoordinatorRouter.resolve_entities_and_route(ctx)

    # 3. Specialist Investigations
    await OrderItemAgent.investigate(ctx)
    await ShipmentAgent.investigate(ctx)
    await PaymentAgent.investigate(ctx)

    # 4. Business Policy Evaluation & Remedies
    await PolicyAgent.evaluate(ctx)

    # 5. Independent Verification & Output Synthesis
    return VerifierAgent.synthesize_and_verify(ctx)
