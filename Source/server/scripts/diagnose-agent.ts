import { sendZegoRequest } from '../lib/zego';

async function diagnose() {
    console.log('--- Checking Registered Agents ---');
    const agentList = await sendZegoRequest('GetAgentList', {
        Page: 1,
        Limit: 10
    });
    console.log('Agent List:', JSON.stringify(agentList, null, 2));

    const myAgent = agentList.Data?.AgentList?.find((a: any) => a.AgentId === 'xiaoyeV1');
    if (myAgent) {
        console.log('✅ Agent xiaoyeV1 is registered.');
        console.log('LLM Config:', JSON.stringify(myAgent.LLM, null, 2));
    } else {
        console.log('❌ Agent xiaoyeV1 is NOT registered!');
    }

    console.log('\n--- Checking Active Instances ---');
    // Note: This API might require specific parameters depending on version
    const instanceList = await sendZegoRequest('GetAgentInstanceList', {
        AgentId: 'xiaoyeV1',
        Page: 1,
        Limit: 10
    });
    console.log('Instance List:', JSON.stringify(instanceList, null, 2));
}

diagnose().catch(console.error);
