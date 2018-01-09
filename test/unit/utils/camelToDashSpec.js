import camelToDash from '../../../src/utils/camel-to-dash';
import { expect } from 'chai';

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
