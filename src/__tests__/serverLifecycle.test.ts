import { executeToolSafely, registerGracefulShutdown } from '../index';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`❌ Assertion Failed: ${message}`);
}

async function runTests() {
    console.log("🏃 Running Server Lifecycle & Error Boundary Tests...");

    // Test 1: executeToolSafely success
    const res1 = await executeToolSafely(async () => ({ success: true, count: 5 }));
    assert(!res1.isError, "executeToolSafely success should not have isError set");
    assert(Array.isArray(res1.content) && res1.content.length === 1, "Should have 1 content item");
    assert(res1.content[0].type === "text", "Content type should be text");
    const parsed1 = JSON.parse(res1.content[0].text);
    assert(parsed1.success === true && parsed1.count === 5, "Content matches serialized result");

    // Test 2: executeToolSafely returned object with error field
    const res2 = await executeToolSafely(async () => ({ error: "bad input", details: "missing param" }));
    assert(res2.isError === true, "executeToolSafely with error field should set isError: true");
    const parsed2 = JSON.parse(res2.content[0].text);
    assert(parsed2.error === "bad input" && parsed2.details === "missing param", "Error payload preserved");

    // Test 3: executeToolSafely thrown Error (e.g. WAF 403)
    const res3 = await executeToolSafely(async () => {
        throw new Error("WAF 403");
    });
    assert(res3.isError === true, "executeToolSafely thrown error should set isError: true");
    const parsed3 = JSON.parse(res3.content[0].text);
    assert(parsed3.status === "error", "Status should be error");
    assert(parsed3.error === "WAF 403", "Error message should match thrown Error");

    // Test 4: registerGracefulShutdown idempotency & stdin close
    let cleanupCount = 0;
    let exitCode: number | null = null;
    const procHandlers: Record<string, () => void> = {};
    const stdinHandlers: Record<string, () => void> = {};

    const fakeProc = {
        once: (evt: string, listener: () => void) => {
            procHandlers[evt] = listener;
            return fakeProc;
        },
        stdin: {
            once: (evt: string, listener: () => void) => {
                stdinHandlers[evt] = listener;
                return fakeProc.stdin;
            }
        },
        exit: (code: number) => {
            exitCode = code;
        }
    };

    const cleanupFn = async () => {
        cleanupCount++;
        await new Promise((r) => setTimeout(r, 20));
    };

    registerGracefulShutdown(cleanupFn, fakeProc as any);

    assert(typeof stdinHandlers['close'] === 'function', "stdin close handler registered");
    assert(typeof procHandlers['SIGINT'] === 'function', "SIGINT handler registered");
    assert(typeof procHandlers['SIGTERM'] === 'function', "SIGTERM handler registered");

    // Trigger both stdin 'close' and 'SIGTERM' to test idempotency
    stdinHandlers['close']();
    procHandlers['SIGTERM']();

    // Wait for the async shutdown promise to resolve
    await new Promise((r) => setTimeout(r, 60));

    assert(cleanupCount === 1, `cleanupFn called exactly once, actual: ${cleanupCount}`);
    assert(exitCode === 0, `proc.exit(0) was called, actual: ${exitCode}`);

    console.log("✅ All Server Lifecycle & Error Boundary Tests Passed!");
}

runTests().catch((err) => {
    console.error(err);
    process.exit(1);
});
