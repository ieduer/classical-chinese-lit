// The original account and poem are fixed before any asynchronous work.
(function (root) {
    const DATA_VERSION = 'sha256:ad0aad7245517e84d49fe967c6207ed07df51bd6c9c4c483d770336f1eaa1f50';
    let generation = 0;
    const pending = new Map();
    root.addEventListener?.('bdfz:session-invalidated', () => { generation++; });
    function service() {
        if (!root.BdfzLearningRecords) throw new Error('学习记录尚未准备好，请稍后重试。');
        return root.BdfzLearningRecords;
    }
    async function save(s, operation) {
        pending.set(operation.operationId, { s, operation });
        await s.record(operation);
        pending.delete(operation.operationId);
    }
    function capture(payload, sessionKey) {
        if (pending.size) throw new Error('请先重试保存已有记录。');
        const s = service(), snapshot = JSON.parse(JSON.stringify(payload));
        const scope = s.scope || null, epoch = generation;
        const context = { sessionKey, captureScope: scope, resourceKey: `mf:poem-${snapshot.poemContext.order}:chat`, resourceVersion: DATA_VERSION,
            chapterId: String(snapshot.poemContext.order), chapterTitle: snapshot.poemContext.title, interactionType: 'poem_question', sourceContext: { selection: snapshot.selectedText } };
        const pointerKey = scope ? `mf-learning-parent-v1:${scope}:${context.resourceKey}` : null;
        let previous = '';
        try { if (pointerKey) previous = root.localStorage.getItem(pointerKey) || ''; } catch (_) { /* An unavailable ancestry pointer is not invented. */ }
        const answer = s.build('answer.submit', { text: snapshot.explicitQuery, selectedText: snapshot.selectedText, poemContext: snapshot.poemContext }, context,
            { actor: 'student', status: 'succeeded', parentOperationId: previous, assessment: { scoringEligibility: 'record_only' } });
        return { s, context, snapshot, answer, pointerKey, current: () => epoch === generation && (s.scope || null) === scope };
    }
    async function send(c, request) {
        const { s, context, snapshot, answer } = c;
        await save(s, answer);
        if (!c.current()) throw new Error('账号已切换；原问题已保留，未发送新的请求。');
        try { if (c.pointerKey) root.localStorage.setItem(c.pointerKey, answer.operationId); } catch (_) { /* Full operation remains durable. */ }
        const attempt = s.build('ai.request', { request: snapshot, attemptNumber: 1 }, context,
            { actor: 'system', status: 'pending', parentOperationId: answer.operationId, contentOrigin: 'request_context', assessment: { scoringEligibility: 'record_only' } });
        await save(s, attempt);
        if (!c.current()) throw new Error('账号已切换；原请求记录已保留，未调用模型。');
        let result;
        try {
            result = await request(snapshot);
        } catch (error) {
            const failed = s.build('ai.failure', { errorClass: error.name || 'Error', message: String(error.message || '请求失败'), httpStatus: error.status || null, responseBody: typeof error.responseBody === 'string' ? error.responseBody : null }, context,
                { actor: 'system', status: 'failed', parentOperationId: attempt.operationId, contentOrigin: 'transport_result', assessment: { scoringEligibility: 'record_only' } });
            await save(s, failed);
            return { visible: c.current(), error: error.name === 'AbortError' ? '请求超时，原问题及失败记录已保留。' : '请求失败，原问题及失败记录已保留。', answer, failure: failed };
        }
        const valid = typeof result?.reply === 'string' && result.reply.trim().length > 0;
        const reply = s.build('assistant.reply', { text: typeof result?.reply === 'string' ? result.reply : '', response: result }, context,
            { actor: 'assistant', status: valid ? 'succeeded' : 'failed', parentOperationId: attempt.operationId, contentOrigin: 'ai_reply', assessment: { scoringEligibility: 'record_only', reportedModel: typeof result?.model === 'string' ? result.model : null, reportedModelVersion: typeof result?.modelVersion === 'string' ? result.modelVersion : null, modelProvenance: typeof result?.model === 'string' ? 'response_declared' : 'not_reported' } });
        await save(s, reply);
        return { visible: c.current(), text: valid ? result.reply : null, error: valid ? null : '返回内容未形成有效回答；原始响应已完整保留。', answer, reply };
    }
    async function retryStorage() {
        for (const { s, operation } of [...pending.values()]) await save(s, operation);
        return service().retry();
    }
    root.MfLearningChat = { capture, send, retryStorage, pendingCount: () => pending.size };
})(typeof window === 'undefined' ? globalThis : window);
