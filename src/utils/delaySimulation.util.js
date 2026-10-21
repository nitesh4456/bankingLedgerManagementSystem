/*
*- utily for delay simulation
*- function parameters are : requestId, sessionID, time_in_seconds
*/

async function delaySimulation(requestId, sessionId, time_in_seconds){
    console.time(`Debit-to-credit delayrequestId: ${requestId}, sessionId: ${sessionId}`); 
    console.log(`requestId: ${requestId}, sessionId: ${sessionId}---  Before delay : `, new Date().toISOString());
    await new Promise(resolve => setTimeout(resolve, 50_000));
    console.log(`requestId: ${requestId}, sessionId: ${sessionId} -- After delay :`, new Date().toISOString());
    console.time(`Debit-to-credit delayrequestId: ${requestId}, sessionId: ${sessionId}`); 
}

module.exports = delaySimulation

// /continue to change the time_in_seconds