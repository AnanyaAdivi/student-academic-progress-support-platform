import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';

const { runSeeds, DEV_PASSWORDS } = await import('../src/db/seeds/seed.js');
const { loginAs, withCsrf } = await import('./helpers/testClient.js');

const RUNS = 20;
const CONCURRENCY = 50;

async function runHarness() {
  await runSeeds();

  const prof = await loginAs('prof.sharma@sau.int', DEV_PASSWORDS.professor);
  const admin = await loginAs('admin@sau.int', DEV_PASSWORDS.admin);

  const students = [];
  for (let start = 1; start <= CONCURRENCY; start += 10) {
    const batch = Array.from({ length: Math.min(10, CONCURRENCY - start + 1) }, (_, idx) =>
      loginAs(`student${start + idx}@sau.int`, DEV_PASSWORDS.student)
    );
    students.push(...(await Promise.all(batch)));
  }

  const lines = [];
  const log = (msg) => {
    console.log(msg);
    lines.push(msg);
  };

  log(`=== Concurrency Harness: ${CONCURRENCY} students x ${RUNS} runs ===`);
  log(`Timestamp: ${new Date().toISOString()}\n`);

  let totalDoubleBookings = 0;
  let totalServerErrors = 0;

  for (let run = 1; run <= RUNS; run++) {
    const offsetHours = 24 * 15 + run * 2;
    const startTime = new Date(Date.now() + offsetHours * 3600 * 1000).toISOString();
    const endTime = new Date(Date.now() + (offsetHours + 1) * 3600 * 1000).toISOString();

    const slotRes = await withCsrf(prof.agent.post('/api/slots'), prof.csrfToken).send({
      startTime,
      endTime,
    });

    if (![200, 201].includes(slotRes.status)) {
      throw new Error(`Failed to create slot on run ${run}: ${slotRes.status} ${JSON.stringify(slotRes.body)}`);
    }
    const slotId = slotRes.body.slot?.id ?? slotRes.body.data?.id ?? slotRes.body.id;

    const reqResults = await Promise.all(
      students.map((s, idx) =>
        withCsrf(s.agent.post(`/api/slots/${slotId}/requests`), s.csrfToken)
          .set('Idempotency-Key', `conc-r${run}-s${idx + 1}-${crypto.randomUUID()}`)
          .send({ topic: `Concurrent booking attempt #${idx + 1}` })
      )
    );

    const createdReqs = reqResults.filter((r) => [200, 201].includes(r.status));
    const req5xx = reqResults.filter((r) => r.status >= 500).length;

    let confirmedCount = createdReqs.length;
    let confirmRejected = reqResults.filter((r) => [409, 422].includes(r.status)).length;
    let confirm5xx = 0;

    if (createdReqs.length > 1) {
      const reqIds = createdReqs.map((r) => r.body.request?.id ?? r.body.data?.id ?? r.body.id);
      const confirmResults = await Promise.all(
        reqIds.map((reqId) =>
          withCsrf(prof.agent.post(`/api/requests/${reqId}/confirm`), prof.csrfToken)
            .set('Idempotency-Key', `confirm-r${run}-${reqId}`)
        )
      );
      confirmedCount = confirmResults.filter((r) => [200, 201].includes(r.status)).length;
      confirmRejected = confirmResults.filter((r) => [409, 422].includes(r.status)).length;
      confirm5xx = confirmResults.filter((r) => r.status >= 500).length;
    }

    const run5xx = req5xx + confirm5xx;
    if (confirmedCount !== 1) totalDoubleBookings++;
    totalServerErrors += run5xx;

    log(
      `Run ${String(run).padStart(2, '0')}: requestsCreated=${createdReqs.length}, confirmed=${confirmedCount}, conflicts=${confirmRejected}, 5xx=${run5xx}`
    );
  }

  const auditRes = await admin.agent.get('/api/admin/audit/verify');
  const auditValid = auditRes.status === 200 && auditRes.body.valid === true;

  log('\n=== Summary ===');
  log(`Total Runs: ${RUNS}`);
  log(`Invariant Violations (confirmed != 1): ${totalDoubleBookings}`);
  log(`5xx Errors: ${totalServerErrors}`);
  log(`Audit Hash Chain Valid: ${auditValid} (${auditRes.body.totalEvents} events)`);

  const evidenceDir = path.resolve(process.cwd(), 'docs', 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, 'concurrency-report.txt');
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  log(`Evidence saved to: ${outPath}`);

  if (totalDoubleBookings > 0 || totalServerErrors > 0 || !auditValid) {
    process.exitCode = 1;
  }
}

runHarness().catch((err) => {
  console.error('Concurrency harness failed:', err);
  process.exit(1);
});
