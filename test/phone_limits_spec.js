'use strict';

// Review fixes of 2026-11-20 (corbit-phone-numbers rule 3): length limits, a bracket at the start
// only around a country code, direction overrides refused, and no slow regex on long input.
// Invisible characters are written as escapes so this file holds none.
const assert = require('node:assert/strict');
const corbit = require('../nodes/lib/corbit');

const SA = '966501234567';
const N = corbit.normalizeNumber;

describe('phone limits (review 2026-11-20)', function () {
	it('a bracket at the start around a country code is formatting', function () {
		assert.equal(N('(+966) 50 123 4567'), SA);
		assert.equal(N('(00966) 50 123 4567'), SA);
		assert.equal(N('( +966 ) 50 123 4567'), SA);
		assert.equal(N('(050) 123 4567'), SA);
		assert.equal(N('+1 (202) 555-0123'), '12025550123');
	});

	it('a bracket at the start around a whole number is refused (it would become someone else)', function () {
		for (const raw of ['(+971501234567) 1', '( +971501234567) 1', '(+971501234567)1', '(971501234567) 1', '(+97150) 1234567']) {
			assert.equal(N(raw), undefined, raw);
		}
	});

	it('direction overrides are refused, other direction marks are removed', function () {
		assert.equal(N('‮7654321050'), undefined);
		assert.equal(N('‭0501234567'), undefined);
		assert.equal(N('0501234567‮'), undefined);
		assert.equal(N('‪0501234567‬'), SA);
		assert.equal(N('‫0501234567‬'), SA);
		assert.deepEqual(corbit.splitNumbers('‮7654321050').map(N), [undefined]);
	});

	it('a number is at most 40 characters once the marks are removed, and 200 with them', function () {
		const exactly40 = '+966-' + '-'.repeat(26) + '501234567';
		assert.equal(exactly40.length, 40);
		assert.equal(N(exactly40), SA);
		assert.equal(N('+966-' + '-'.repeat(27) + '501234567'), undefined);
		const marked = '0501234567' + '​'.repeat(190);
		assert.equal(marked.length, 200);
		assert.equal(N(marked), SA);
		assert.equal(N(marked + '​'), undefined);
	});

	it('long input is refused quickly (no slow regex)', function () {
		const start = Date.now();
		assert.equal(N('('.repeat(200000) + 'x'), undefined);
		assert.equal(N('( ' + ' '.repeat(200000) + 'x'), undefined);
		assert.equal(N(' '.repeat(200000) + 'x'), undefined);
		assert.deepEqual(corbit.splitNumbers('( ' + ' '.repeat(100000) + 'x'), ['(', 'x']);
		corbit.splitNumbers('1 '.repeat(100000) + 'x');
		assert.ok(Date.now() - start < 1000, `took ${Date.now() - start} ms`);
	});

	it('a list keeps "(+966) 50 123 4567" as one number', function () {
		const pieces = corbit.splitNumbers('(+966) 50 123 4567, 0509876543');
		assert.equal(pieces.length, 2);
		assert.deepEqual(pieces.map(N), [SA, '966509876543']);
	});

	it('the error for a bad number shows at most 60 characters', async function () {
		await assert.rejects(
			corbit.sendSms({ token: 'test-token', baseUrl: 'https://api.corbit.sa', fetchImpl: () => assert.fail('no request expected') }, { sender: 'OT.SA', to: '+971501234567 ' + 'x'.repeat(500), message: 'hi' }),
			(e) => e.message.length < 120,
		);
	});
});
