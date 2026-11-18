'use strict';

// The phone-number reference table of the corbit-phone-numbers skill (reference.md), row by row,
// "plugins (international)" column. Invisible characters are written as escapes so this file holds none.
const assert = require('node:assert/strict');
const corbit = require('../nodes/lib/corbit');
const { createMockApi, ok } = require('./mock-api');

const SA = '966501234567';
// test titles show the invisible marks as escapes
const MARKS = /[\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const show = (v) => JSON.stringify(v).replace(MARKS, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));

const ACCEPTED = [
	['0501234567', SA], // Saudi local
	['501234567', SA], // without the 0
	['966501234567', SA],
	['+966501234567', SA],
	['00966501234567', SA],
	['+966 50 123 4567', SA], // spaces, as copied from phone contacts
	['+966 (0)50 123 4567', SA], // trunk (0) after the country code is dropped
	['٠٥٠١٢٣٤٥٦٧', SA], // Arabic-Indic digits
	['۰۵۰۱۲۳۴۵۶۷', SA], // Persian digits
	['+971501234567', '971501234567'],
	['00971501234567', '971501234567'],
	['971501234567', '971501234567'],
	['+53 512345678', '53512345678'], // "+" with another code never becomes Saudi
	[966501234567, SA], // a safe integer (number type)
	['+1 (202) 555-0123', '12025550123'], // a bracket in the middle is allowed
	['(+966) 50 123 4567', SA], // a bracket at the start is allowed
	['\u202a0501234567\u202c', SA], // direction marks from copying are removed
	['\u2066+966 50 123 4567\u2069', SA], // direction isolates (Android) are removed
	['0501234567\u200b', SA], // zero-width space is removed
	['\u061c0501234567', SA], // Arabic letter mark is removed
	['+44 020 7946 0958', '4402079460958'], // a trunk 0 without brackets after another code is kept on purpose
];

const REFUSED = [
	'0123456789', // local number of an unknown country
	'07911123456', // local number of an unknown country
	'96650123456', // one digit short after 9665
	'9665012345678', // one digit too many after 9665
	'966501234567.0', // decimal value
	'+966501234567.0', // decimal value with +
	'+971501234567.0', // the dot must not be dropped: it would become the wrong number 9715012345670
	'05.01234567', // a dot is not a separator
	'966.501.234.567', // a dot is not a separator
	'9.66501E+11', // scientific notation from Excel (as text)
	966501234567.5, // a number that is not an integer
	'0501234567 ext 12', // letters
	'+971501234567 (1)', // bracket at the end: dropping it gives 9715012345671, someone else
	'+971 4 123 4567 (101)', // extension in brackets at the end
	'0501234567 (1)', // bracket at the end
	'abc',
	'',
	null,
];

describe('phone reference: one number', () => {
	for (const [raw, want] of ACCEPTED) {
		it(`${show(raw)} -> ${want}`, () => {
			assert.equal(corbit.normalizeNumber(raw), want);
		});
	}
	for (const raw of REFUSED) {
		it(`${show(raw)} is refused`, () => {
			assert.equal(corbit.normalizeNumber(raw), undefined);
		});
	}
	it('"+9(0)71501234567" never becomes the UAE number 971...', () => {
		const r = corbit.normalizeNumber('+9(0)71501234567');
		assert.ok(r === undefined || r === '9071501234567', String(r));
	});
});

describe('phone reference: splitting a list', () => {
	it('splits like the reference table', () => {
		assert.deepEqual(corbit.splitNumbers('+966 50 123 4567'), ['+966501234567']);
		assert.deepEqual(corbit.splitNumbers('0501234567 0509876543'), ['0501234567', '0509876543']);
		assert.deepEqual(corbit.splitNumbers('0501234567،0509876543؛0551234567'), ['0501234567', '0509876543', '0551234567']);
		assert.deepEqual(corbit.splitNumbers('0501234567\t0509876543'), ['0501234567', '0509876543']);
		assert.deepEqual(corbit.splitNumbers('0501234567\n0509876543'), ['0501234567', '0509876543']);
		const mixed = corbit.splitNumbers('abc 0501234567');
		assert.deepEqual(mixed, ['abc', '0501234567']);
		assert.equal(corbit.normalizeNumber(mixed[0]), undefined, 'abc is refused');
		assert.deepEqual(corbit.splitNumbers('+966 50 123 4567, 05 0123 4567'), ['+966501234567', '0501234567']);
	});
	it('removes the invisible marks before reading a piece', () => {
		assert.deepEqual(corbit.splitNumbers('\u2066+966 50 123 4567\u2069, \u202a0551234567\u202c'), ['+966501234567', '0551234567']);
	});
	it('never joins a bracket note at the end into a number', () => {
		const tokens = corbit.splitNumbers('+971501234567 (1), 0501234567');
		assert.ok(!tokens.map((t) => corbit.normalizeNumber(t)).includes('9715012345671'), JSON.stringify(tokens));
		assert.ok(tokens.some((t) => corbit.normalizeNumber(t) === undefined), 'the piece with "(1)" is refused');
	});
});

describe('phone reference: bulk send', () => {
	const api = createMockApi();
	let conn;
	before(async () => {
		conn = { token: 'test-token', baseUrl: (await api.start()) + '/' };
	});
	after(() => api.stop());
	beforeEach(() => api.reset());

	it('"0501234567, 966501234567" is sent as one number', async () => {
		api.reply(ok({ status: 'Success', data: { message: { id: 'b1', status: 'pending' } } }));
		const r = await corbit.sendBulkSms(conn, { sender: 'A', numbers: '0501234567, 966501234567', message: 'hi' });
		assert.deepEqual(r.numbers, [SA]);
		assert.deepEqual(api.requests[0].body.numbers, [SA]);
	});
	it('a list with "+971501234567 (1)" sends nothing', async () => {
		await assert.rejects(corbit.sendBulkSms(conn, { sender: 'A', numbers: '+971501234567 (1), 0501234567', message: 'hi' }), /Invalid mobile numbers/);
		assert.equal(api.requests.length, 0);
	});
});
