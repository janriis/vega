export function getNode(nodeId, dialogue) {
  return dialogue[nodeId] ?? null;
}

export function isTerminal(nodeId, dialogue) {
  const node = getNode(nodeId, dialogue);
  return !node || node.choices.length === 0;
}

export function chooseOption(nodeId, choiceIndex, dialogue, flags) {
  const node = getNode(nodeId, dialogue);
  if (!node || choiceIndex >= node.choices.length) return null;
  const choice = node.choices[choiceIndex];
  const nextNode = getNode(choice.next, dialogue);
  const newFlags = { ...flags };
  if (nextNode?.setFlag) newFlags[nextNode.setFlag] = true;
  return {
    nextNodeId: choice.next,
    flags: newFlags,
    reputationDelta: choice.reputationDelta ?? null,
    setMission: choice.setMission ?? null
  };
}
