import { describe, it, expect } from 'vitest';
import camelToDash from '@root/utils/camelToDash.js';

describe('#camelToDash', function () {
    describe('when string is camel cased', function () {
        it('must convert it to dashed string', function () {
            expect(camelToDash('testMeOrNot')).toEqual('test-me-or-not');
        });
    });

    describe('when string doesn\'t contain camel case', function () {
        it('must leave it as is', function () {
            expect(camelToDash('this_is-a_test')).toEqual('this_is-a_test');
        });
    });
});
