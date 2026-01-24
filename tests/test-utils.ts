/**
 * Shared test utilities for tinyRPC test suite
 */

export const testResults = {
    passed: 0,
    failed: 0,
    failures: [] as string[],

    async run(testName: string, fn: () => Promise<void>) {
        try {
            await fn();
            console.log(`[PASS] ${testName}`);
            this.passed++;
        } catch (error: any) {
            console.log(`[FAIL] ${testName}: ${error.message}`);
            this.failed++;
            this.failures.push(`${testName}: ${error.message}`);
        }
    },

    printSummary(suiteName: string) {
        console.log(`\n[INFO] ${suiteName} Test Results Summary:`);
        console.log(`[PASS] Passed: ${this.passed}`);
        console.log(`[FAIL] Failed: ${this.failed}`);

        if (this.failed > 0) {
            console.log('\n[FAIL] Failures:');
            this.failures.forEach((failure) => console.log(`  - ${failure}`));
        }

        const total = this.passed + this.failed;
        const rate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : '0.0';
        console.log(`\n[INFO] Success Rate: ${rate}%`);

        if (this.failed === 0) {
            console.log(`\n[SUCCESS] All ${suiteName} tests passed!`);
        } else {
            process.exit(1);
        }
    }
};
