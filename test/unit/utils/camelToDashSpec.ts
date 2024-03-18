import { expect } from 'chai';
import camelToDash from '@/utils/camelToDash.js';

describe('#camelToDash', function () {
    context('when string is camel cased', function () {
        it('must convert it to dashed string', function () {
            expect(camelToDash('testMeOrNot')).to.eql('test-me-or-not');
        });
    });

    context('when string doesn\'t contain camel case', function () {
        it('must leave it as is', function () {
            expect(camelToDash('this_is-a_test')).to.eql('this_is-a_test');
        });
    });
});
