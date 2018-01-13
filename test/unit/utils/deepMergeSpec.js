import deepMerge from '../../../src/utils/deep-merge';
import { expect } from 'chai';

describe('#deepMerge', function () {
    context('when a single plain object source is provided', function () {
        const source = {
            foo: 'bar'
        };
        const dest = {
            bar: 'foo'
        };

        it('must merge source with destination', function () {
            expect(deepMerge(dest, source)).to.deep.eql({
                foo: 'bar',
                bar: 'foo'
            });
        });
    });

    context('when multiple source objects are provided', function () {
        const source1 = {
            foo: 'bar'
        };

        const source2 = {
            foo2: 'bar2'
        };

        const dest = {
            bar: 'foo'
        };

        it('must merge sources with destination', function () {
            expect(deepMerge(dest, source1, source2)).to.deep.eql({
                foo: 'bar',
                foo2: 'bar2',
                bar: 'foo'
            });
        });
    });

    context('when both source and destination have nested objects', function () {
        const source = {
            foo: {
                child1: 'bar'
            }
        };
        const dest = {
            foo: {
                child2: 'foo'
            }
        };

        it('must merge nested properties of source and destination', function () {
            expect(deepMerge(dest, source)).to.deep.eql({
                foo: {
                    child1: 'bar',
                    child2: 'foo'
                }
            });
        });
    });

    context('when both source and destination have Array property', function () {
        const source = {
            children: ['foo']
        };
        const dest = {
            children: ['bar']
        };

        it('must merge nested properties of source and destination', function () {
            expect(deepMerge(dest, source)).to.deep.eql({
                children: ['bar', 'foo']
            });
        });
    });

});
