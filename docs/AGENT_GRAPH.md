# Deterministic demonstration agent graph

The frontend simulator runs these nodes in one fixed linear order. It performs no real autonomous legal action.

| # | Agent | Input | Fixed demonstration output |
| --- | --- | --- | --- |
| 1 | Case Intake Agent | Case metadata and document inventory | Normalised closed case profile |
| 2 | Document Classification Agent | Eight document records | Classified fictional record types |
| 3 | Transcript Parsing Agent | Transcript extract | Speaker turns and demo spans |
| 4 | Fact Extraction Agent | Classified spans | 24 source-linked observations |
| 5 | Timeline Reconstruction Agent | Observations | Six events and arrest-time conflict |
| 6 | Contradiction Detection Agent | Timeline and facts | Three reviewable contradictions |
| 7 | Procedural Audit Agent | Facts and contradictions | Four cautious potential concerns |
| 8 | Statutory Research Agent | Potential concerns | `STAT-0001` and `STAT-0002` |
| 9 | Precedent Retrieval Agent | Research propositions | `AUTH-0001` through `AUTH-0003` |
| 10 | Precedent Applicability Agent | Closed authorities and facts | Applicability and distinguishing notes |
| 11 | Motion Strategy Agent | Findings and authorities | Four candidate strategies |
| 12 | Ethics Auditor Agent | Candidate strategies | Required fabrication-claim rejection |
| 13 | Motion Drafting Agent | Ethics-filtered strategies | Attorney-review draft |
| 14 | Citation Verification Agent | Draft and closed records | Nine synthetic verification passes |
| 15 | Attorney Review Coordinator | Draft and checks | Paused human-review boundary |

## Transitions

`idle → running → completed` is the normal path. `running → paused → running` retains the current index. Reset returns the nodes to one queued intake node and fourteen locked nodes without deleting case or document metadata.

Only one timer exists for the active node. Its seeded duration is 850ms plus 75ms for each subsequent index. Timer cleanup on status, index, route, or unmount prevents duplicate transitions. A refresh restores completed nodes and the current status from versioned localStorage; running state resumes from the retained node.

The UI includes failed-state styling for completeness but no random failure activates. Retry count is always zero. Each completed node exposes its stable input, output, duration, and source references.

Workflow start, pause, resume, reset, each node completion, and final completion create local audit events. Rendering does not create events.

The graph ends at the Attorney Review Coordinator. Ethics approval is not attorney approval, approval is not filing, and no export or legal action occurs autonomously.
